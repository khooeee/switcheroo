import { relativeChangePath } from "./relativeChangePath";

/** `path` (absolute, or relative to `cwd`) as an explorer path like "src/a.ts"; null when outside `cwd`. */
export function projectRelativePath(path: string, cwd: string): string | null {
  const relative = relativeChangePath(path, cwd);
  const slashed = cwd.includes("\\") ? relative.replace(/\\/g, "/") : relative;
  if (/^(\/|[A-Za-z]:\/)/.test(slashed)) return null;
  const parts = slashed.split("/").filter((part) => part && part !== ".");
  if (parts.length === 0 || parts.includes("..")) return null;
  return parts.join("/");
}
