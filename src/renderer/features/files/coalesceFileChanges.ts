import type { FileChange } from "../../../shared/types";

/** One chip/diff per path: earliest oldText, latest newText/kind. */
export function coalesceFileChanges(changes: FileChange[]): FileChange[] {
  const byPath = new Map<string, FileChange>();
  for (const change of changes) {
    const existing = byPath.get(change.path);
    if (!existing) {
      byPath.set(change.path, { ...change });
      continue;
    }
    byPath.set(change.path, {
      path: change.path,
      kind: change.kind,
      oldText: existing.oldText !== undefined ? existing.oldText : change.oldText,
      newText: change.newText !== undefined ? change.newText : existing.newText,
    });
  }
  return [...byPath.values()];
}
