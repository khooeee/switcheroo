import type { Session } from "../session";
import { childMatchesFilter } from "./childMatchesFilter";

function parentMatchesFilter(session: Session, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    session.title.toLowerCase().includes(needle) ||
    session.cwd.toLowerCase().includes(needle)
  );
}

/** Whether a chat group appears under the current filter. */
export function groupMatchesFilter(session: Session, query: string): boolean {
  if (!query.trim()) return true;
  if (parentMatchesFilter(session, query)) return true;
  return session.tabs.some((tab) => childMatchesFilter(tab, query));
}
