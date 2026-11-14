import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { parseShellEnv } from "./parseShellEnv";
import { shellInvocation } from "./shellInvocation";
import { userShell } from "./userShell";

const TIMEOUT_MS = 10_000;

function killGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // Already gone.
  }
}

/**
 * Run the user's shell once as a login, interactive shell and read the environment its startup
 * files build. Rejects if the shell fails, prints no PATH, or takes longer than 10 seconds.
 */
export function resolveShellEnv(): Promise<NodeJS.ProcessEnv> {
  // Windows apps already inherit the user's environment.
  if (process.platform === "win32") return Promise.resolve({ ...process.env });
  const shell = userShell();
  const mark = randomBytes(16).toString("hex");
  const child = spawn(shell, shellInvocation(shell, mark), {
    cwd: homedir(),
    // Its own process group, so a timeout also kills whatever the startup files started.
    detached: true,
    // No input, so a prompt in a startup file reads EOF instead of hanging.
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, SWITCHEROO_RESOLVING_SHELL_ENV: "1" },
  });

  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    // Kills a shell that is still running after the timeout, even one that already printed.
    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) killGroup(child.pid);
      child.stdout.destroy();
      fail(new Error(`${shell} took longer than ${TIMEOUT_MS / 1000}s to start`));
    }, TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (settled) return;
      output += chunk;
      const env = parseShellEnv(output, mark);
      if (!env) return;
      if (!env.PATH) return fail(new Error(`${shell} printed no PATH`));
      settled = true;
      resolve(env);
    });
    child.on("error", fail);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      fail(new Error(`${shell} exited (${signal ?? code}) without printing its environment`));
    });
  });
}
