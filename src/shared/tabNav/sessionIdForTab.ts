import type { ActiveTabId } from "../activeTabId";
import type { Session } from "../session";
import { SWITCHBOARD_ID } from "../switchboardId";

/** Resolve which chat session owns the active tab (parent or child). */
export function sessionIdForTab(
  activeTabId: ActiveTabId,
  sessions: Iterable<Session>,
): string | null {
  if (activeTabId === SWITCHBOARD_ID) return null;
  for (const session of sessions) {
    if (session.id === activeTabId) return session.id;
    if (session.tabs.some((tab) => tab.tabId === activeTabId)) return session.id;
  }
  return null;
}
