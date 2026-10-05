import type { Session, SessionTab } from "../session";
import { childMatchesFilter } from "./childMatchesFilter";

/** Children to render for a visible parent under the filter. */
export function visibleChildren(session: Session, query: string): SessionTab[] {
  const needle = query.trim();
  if (!needle) return session.tabsExpanded ? session.tabs : [];
  if (session.tabsExpanded) return session.tabs;
  return session.tabs.filter((tab) => childMatchesFilter(tab, query));
}
