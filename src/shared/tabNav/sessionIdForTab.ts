import type { ActiveTabId } from "../activeTabId";
import type { Session } from "../session";
import { SWITCHBOARD_ID } from "../switchboardId";

/** The open session behind the active tab; null on Switchboard or an unknown id. */
export function sessionIdForTab(
  activeTabId: ActiveTabId,
  sessions: Iterable<Session>,
): string | null {
  if (activeTabId === SWITCHBOARD_ID) return null;
  for (const session of sessions) {
    if (session.id === activeTabId) return session.id;
  }
  return null;
}
