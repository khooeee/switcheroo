import type { Session } from "../../../shared/types";

/** Case-insensitive match against session title or cwd. */
export function sessionMatchesFilter(session: Session, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    session.title.toLowerCase().includes(needle) ||
    session.cwd.toLowerCase().includes(needle)
  );
}
