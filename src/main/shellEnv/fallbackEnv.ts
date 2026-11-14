import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Switcheroo's own environment plus the bin dirs a terminal usually has: what agents get when the
 * login shell cannot be read. Dock and desktop-launcher starts inherit a bare PATH.
 */
export function fallbackEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME || homedir();
  const dirs = [
    ...(process.env.PATH ?? "").split(":"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    join(home, ".local", "bin"),
    join(home, "bin"),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  return { ...process.env, PATH: [...new Set(dirs.filter(Boolean))].join(":") };
}
