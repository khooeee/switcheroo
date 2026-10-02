import { join } from "node:path";

const PATH_FALLBACKS = [
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
];

/** PATH for agent CLIs: GUI launches inherit a minimal PATH, so add common bin dirs. */
export function agentSearchPath(home: string): string {
  return [process.env.PATH, ...PATH_FALLBACKS, join(home, ".local", "bin")]
    .filter(Boolean)
    .join(":");
}
