import type { Session } from "../session";
import { sessionMatchesFilter } from "./sessionMatchesFilter";

/** Visible tab order for Ctrl+Tab: each session matching the filter. */
export function visibleTabOrder(
  pinned: Session[],
  unpinned: Session[],
  filterQuery: string,
): string[] {
  return [...pinned, ...unpinned]
    .filter((session) => sessionMatchesFilter(session, filterQuery))
    .map((session) => session.id);
}
