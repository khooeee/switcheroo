/** Where a dragged child tab would land in the session rail. */
export type TabDropTarget =
  | { sessionId: string; mode: "parent" }
  | { sessionId: string; mode: "insert"; index: number };

export function sameTabDropTarget(
  a: TabDropTarget | null,
  b: TabDropTarget | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.sessionId !== b.sessionId || a.mode !== b.mode) return false;
  if (a.mode === "insert" && b.mode === "insert") return a.index === b.index;
  return true;
}
