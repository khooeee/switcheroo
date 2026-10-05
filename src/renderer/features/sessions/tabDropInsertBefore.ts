import type { Session } from "../../../shared/session";
import { visibleChildren } from "../../../shared/tabNav/visibleChildren";
import type { TabDropTarget } from "./tabDropTarget";

/** Map a visible-child insert index to an index in `session.tabs`. */
function resolveTabInsertIndex(
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
