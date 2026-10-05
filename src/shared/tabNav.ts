import type { ActiveTabId, Session, SessionTab } from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";

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

export function isChildTabId(sessions: Iterable<Session>, tabId: string): boolean {
  return findChildTab(sessions, tabId) !== null;
}

export function parentMatchesFilter(session: Session, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    session.title.toLowerCase().includes(needle) ||
    session.cwd.toLowerCase().includes(needle)
  );
}

export function childMatchesFilter(tab: SessionTab, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    tab.title.toLowerCase().includes(needle) ||
    (tab.kind === "terminal" && tab.cwd.toLowerCase().includes(needle))
  );
}

/** Whether a chat group appears under the current filter. */
export function groupMatchesFilter(session: Session, query: string): boolean {
  if (!query.trim()) return true;
  if (parentMatchesFilter(session, query)) return true;
  return session.tabs.some((tab) => childMatchesFilter(tab, query));
}

/** Children to render for a visible parent under the filter. */
export function visibleChildren(session: Session, query: string): SessionTab[] {
  const needle = query.trim();
  if (!needle) return session.tabsExpanded ? session.tabs : [];
  if (session.tabsExpanded) return session.tabs;
  return session.tabs.filter((tab) => childMatchesFilter(tab, query));
}

/** Visible tab order for Ctrl+Tab: Switchboard, then each parent and its visible children. */
export function visibleTabOrder(
  pinned: Session[],
  unpinned: Session[],
  filterQuery: string,
): ActiveTabId[] {
  const order: ActiveTabId[] = [SWITCHBOARD_ID];
  for (const session of [...pinned, ...unpinned]) {
    if (!groupMatchesFilter(session, filterQuery)) continue;
    order.push(session.id);
    for (const tab of visibleChildren(session, filterQuery)) {
      order.push(tab.tabId);
    }
  }
  return order;
}
