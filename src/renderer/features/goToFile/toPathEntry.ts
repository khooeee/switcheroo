import type { PathEntry } from "./PathEntry";

/** `path` lowercased with every offset kept: a character whose lowercase is longer ("İ") stays as it is. */
function lowerInPlace(path: string): string {
  const lower = path.toLowerCase();
  if (lower.length === path.length) return lower;
  return Array.from(path, (char) => (char.toLowerCase().length === char.length ? char.toLowerCase() : char)).join("");
}

export function toPathEntry(path: string, kind: PathEntry["kind"]): PathEntry {
  return { path, kind, lower: lowerInPlace(path), nameStart: path.lastIndexOf("/") + 1 };
}
