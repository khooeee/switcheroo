import * as os from "node:os";
import { spawn as ptySpawn, type IPty } from "node-pty";
import { cwdFromOsc7 } from "./cwdFromOsc7";
import { cwdFromPid } from "./cwdFromPid";

type DataListener = (tabId: string, data: string) => void;
type ExitListener = (tabId: string) => void;
type CwdListener = (tabId: string, cwd: string) => void;

interface HostedPty {
  pty: IPty;
  cwd: string;
}

/** Main-process PTY map keyed by terminal tabId. Lazy spawn; never remount on drag. */
export class TerminalHost {
  private ptys = new Map<string, HostedPty>();
  private cwdTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private onData: DataListener | null = null;
  private onExit: ExitListener | null = null;
  private onCwd: CwdListener | null = null;

  setListeners(onData: DataListener, onExit: ExitListener, onCwd?: CwdListener): void {
    this.onData = onData;
    this.onExit = onExit;
    this.onCwd = onCwd ?? null;
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
      if (nextCwd) this.noteCwd(tabId, hosted, nextCwd);
      this.onData?.(tabId, data);
    });
    pty.onExit(() => {
      this.clearCwdTimer(tabId);
      this.ptys.delete(tabId);
      this.onExit?.(tabId);
    });
  }

  write(tabId: string, data: string): void {
    this.ptys.get(tabId)?.pty.write(data);
    // Shells without OSC 7 still change cwd on Enter; refresh from the process.
    if (data.includes("\r") || data.includes("\n")) this.scheduleCwdRefresh(tabId);
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
    this.clearCwdTimer(tabId);
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

  private noteCwd(tabId: string, hosted: HostedPty, cwd: string): void {
    if (!cwd || hosted.cwd === cwd) return;
    hosted.cwd = cwd;
    this.onCwd?.(tabId, cwd);
  }

  private scheduleCwdRefresh(tabId: string): void {
    this.clearCwdTimer(tabId);
    this.cwdTimers.set(
      tabId,
      setTimeout(() => {
        this.cwdTimers.delete(tabId);
        void this.refreshCwd(tabId).then((cwd) => {
          const hosted = this.ptys.get(tabId);
          if (!hosted || !cwd) return;
          // refreshCwd already wrote hosted.cwd; notify even when OSC 7 missed it.
          this.onCwd?.(tabId, cwd);
        });
      }, 100),
    );
  }

  private clearCwdTimer(tabId: string): void {
    const timer = this.cwdTimers.get(tabId);
    if (!timer) return;
    clearTimeout(timer);
    this.cwdTimers.delete(tabId);
  }
}

function defaultShell(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "powershell.exe";
  }
  return process.env.SHELL || "/bin/zsh";
}
