import type { ActiveTabId } from "../activeTabId";
import type { Session } from "../session";

/** The open session behind the active tab; null on Switchboard or an unknown id. */
export function sessionIdForTab(
  activeTabId: ActiveTabId,
  sessions: Iterable<Session>,
): string | null {
  for (const session of sessions) {
    if (session.id === activeTabId) return session.id;
  }
  return null;
}
