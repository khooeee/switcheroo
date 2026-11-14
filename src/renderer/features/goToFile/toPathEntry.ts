import type { PathEntry } from "./PathEntry";

export function toPathEntry(path: string, kind: PathEntry["kind"]): PathEntry {
  return { path, kind, lower: path.toLowerCase(), nameStart: path.lastIndexOf("/") + 1 };
}
