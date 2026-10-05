import type { Session, SessionTab } from "../session";

export function findChildTab(
  sessions: Iterable<Session>,
  tabId: string,
): { session: Session; tab: SessionTab } | null {
  for (const session of sessions) {
    const tab = session.tabs.find((t) => t.tabId === tabId);
    if (tab) return { session, tab };
  }
  return null;
}
