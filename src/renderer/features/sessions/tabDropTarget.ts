import type { Session } from "../../../shared/types";
import { visibleChildren } from "../../../shared/tabNav";

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

/** Map a visible-child insert index to an index in `session.tabs`. */
export function resolveTabInsertIndex(
  session: Session,
  filter: string,
  visualInsertBefore: number,
): number {
  const children = visibleChildren(session, filter);
  if (visualInsertBefore >= children.length) return session.tabs.length;
  const tab = children[visualInsertBefore];
  if (!tab) return session.tabs.length;
  const index = session.tabs.findIndex((item) => item.tabId === tab.tabId);
  return index < 0 ? session.tabs.length : index;
}

/** Final destination index for reorder/move from the current drop target. */
export function tabDropInsertBefore(
  sessions: Session[],
  filter: string,
  toSessionId: string,
  visualInsertBefore: number,
  target: TabDropTarget | null,
): number {
  const dest = sessions.find((item) => item.id === toSessionId);
  if (!dest) return visualInsertBefore;
  if (target?.sessionId === toSessionId && target.mode === "parent") {
    return dest.tabs.length;
  }
  const visual =
    target?.sessionId === toSessionId && target.mode === "insert"
      ? target.index
      : visualInsertBefore;
  return resolveTabInsertIndex(dest, filter, visual);
}

/** Adjust insert-before index for same-list reorder after the item is removed. */
export function reorderIndexAfterRemove(from: number, insertBefore: number): number {
  if (from >= 0 && from < insertBefore) return insertBefore - 1;
  return insertBefore;
}
