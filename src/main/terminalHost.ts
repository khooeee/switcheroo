import * as os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { spawn as ptySpawn, type IPty } from "node-pty";

const execFileAsync = promisify(execFile);

type DataListener = (tabId: string, data: string) => void;
type ExitListener = (tabId: string) => void;

interface HostedPty {
  pty: IPty;
  cwd: string;
}

const OSC7_RE = /\x1b\]7;file:\/\/[^\x07\x1b]*?(\/[^\x07\x1b]*)\x07/g;
const OSC7_ST_RE = /\x1b\]7;file:\/\/[^\x1b]*?(\/[^\x1b]*)\x1b\\/g;

/** Main-process PTY map keyed by terminal tabId. Lazy spawn; never remount on drag. */
export class TerminalHost {
  private ptys = new Map<string, HostedPty>();
  private onData: DataListener | null = null;
  private onExit: ExitListener | null = null;

  setListeners(onData: DataListener, onExit: ExitListener): void {
    this.onData = onData;
    this.onExit = onExit;
  }

  has(tabId: string): boolean {
    return this.ptys.has(tabId);
  }

  ensure(tabId: string, cwd: string): void {
    if (this.ptys.has(tabId)) return;
    const shell = defaultShell();
    const startCwd = cwd.trim() || os.homedir();
    const pty = ptySpawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: startCwd,
      env: {
        ...(process.env as Record<string, string>),
        TERM_PROGRAM: "Switcheroo",
      },
    });
    const hosted: HostedPty = { pty, cwd: startCwd };
    this.ptys.set(tabId, hosted);
    pty.onData((data) => {
      const nextCwd = cwdFromOsc7(data);
      if (nextCwd) hosted.cwd = nextCwd;
      this.onData?.(tabId, data);
    });
    pty.onExit(() => {
      this.ptys.delete(tabId);
      this.onExit?.(tabId);
    });
  }

  write(tabId: string, data: string): void {
    this.ptys.get(tabId)?.pty.write(data);
  }

  resize(tabId: string, cols: number, rows: number): void {
    if (cols < 1 || rows < 1) return;
    this.ptys.get(tabId)?.pty.resize(cols, rows);
  }

  cwd(tabId: string): string | null {
    return this.ptys.get(tabId)?.cwd ?? null;
  }

  async refreshCwd(tabId: string): Promise<string | null> {
    const hosted = this.ptys.get(tabId);
    if (!hosted) return null;
    const fromProc = await cwdFromPid(hosted.pty.pid);
    if (fromProc) hosted.cwd = fromProc;
    return hosted.cwd;
  }

  dispose(tabId: string): void {
    const hosted = this.ptys.get(tabId);
    if (!hosted) return;
    this.ptys.delete(tabId);
    try {
      hosted.pty.kill();
    } catch {
      // already exited
    }
  }

  async disposeMany(tabIds: string[]): Promise<Map<string, string>> {
    const cwds = new Map<string, string>();
    for (const tabId of tabIds) {
      const cwd = await this.refreshCwd(tabId);
      if (cwd) cwds.set(tabId, cwd);
      this.dispose(tabId);
    }
    return cwds;
  }

  async disposeAll(): Promise<Map<string, string>> {
    return this.disposeMany([...this.ptys.keys()]);
  }
}

function defaultShell(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "powershell.exe";
  }
  return process.env.SHELL || "/bin/zsh";
}

function cwdFromOsc7(data: string): string | null {
  let last: string | null = null;
  for (const re of [OSC7_RE, OSC7_ST_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(data))) {
      try {
        last = decodeURIComponent(match[1] ?? "");
      } catch {
        last = match[1] ?? null;
      }
    }
  }
  return last;
}

async function cwdFromPid(pid: number): Promise<string | null> {
  if (!Number.isFinite(pid) || pid <= 0) return null;
  try {
    if (process.platform === "darwin" || process.platform === "linux") {
      const { stdout } = await execFileAsync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"]);
      const line = stdout.split("\n").find((entry) => entry.startsWith("n"));
      if (line && line.length > 1) return line.slice(1);
    }
  } catch {
    return null;
  }
  return null;
}
