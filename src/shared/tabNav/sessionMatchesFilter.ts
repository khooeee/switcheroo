import type { Session } from "../session";

/** Whether a session appears under the current filter. */
export function sessionMatchesFilter(session: Session, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    session.title.toLowerCase().includes(needle) ||
    session.cwd.toLowerCase().includes(needle)
  );
}
