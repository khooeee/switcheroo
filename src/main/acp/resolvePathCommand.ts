import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** First existing install of `name` in common bin dirs (or `extras`); falls back to PATH lookup. */
export function resolvePathCommand(name: string, extras: string[] = []): string {
  const candidates = [
    join(homedir(), ".local", "bin", name),
    join("/usr/local/bin", name),
    join("/opt/homebrew/bin", name),
    ...extras,
    name,
  ];
  for (const c of candidates) {
    if (c === name || existsSync(c)) return c;
  }
  return name;
}
