import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PATH_FALLBACKS = [
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
];

function assertSpawnCwd(cwd: string): void {
  if (!cwd.trim()) throw new Error("Working directory is empty.");
  try {
    if (!statSync(cwd).isDirectory()) {
      throw new Error(`Working directory is not a directory: ${cwd}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Working directory does not exist: ${cwd}`);
    }
    throw err;
  }
}

function enrichPath(home: string): string {
  return [process.env.PATH, ...PATH_FALLBACKS, join(home, ".local", "bin")]
    .filter(Boolean)
    .join(":");
}

/** Spawn an ACP agent CLI; rejects on failure instead of crashing the main process. */
export function spawnAgentProcess(
  command: string,
  args: string[],
  cwd: string,
): Promise<ChildProcessWithoutNullStreams> {
  try {
    assertSpawnCwd(cwd);
  } catch (err) {
    return Promise.reject(err);
  }

  const home = process.env.HOME ?? homedir();
  const proc = spawn(command, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, HOME: home, PATH: enrichPath(home) },
    shell: false,
  }) as ChildProcessWithoutNullStreams;

  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      proc.off("spawn", onSpawn);
      if (err.code === "ENOENT") {
        const missing = command.includes("/") && !existsSync(command)
          ? command
          : `${command} (or its interpreter)`;
        reject(new Error(`Command not found: ${missing}`));
        return;
      }
      reject(err);
    };
    const onSpawn = () => {
      proc.off("error", onError);
      proc.off("spawn", onSpawn);
      // Closed pipes after kill must not become uncaught EPIPE.
      const ignore = (): void => undefined;
      proc.stdin.on("error", ignore);
      proc.stdout.on("error", ignore);
      proc.stderr.on("error", ignore);
      resolve(proc);
    };
    proc.once("error", onError);
    proc.once("spawn", onSpawn);
    // Successful spawns set pid synchronously; test doubles may only set pid.
    if (proc.pid != null) onSpawn();
  });
}
