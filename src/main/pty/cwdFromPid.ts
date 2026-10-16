import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Current working directory of a process (via lsof on macOS/Linux). */
export async function cwdFromPid(pid: number): Promise<string | null> {
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
