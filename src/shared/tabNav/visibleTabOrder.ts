import type { ActiveTabId } from "../activeTabId";
import type { Session } from "../session";
import { SWITCHBOARD_ID } from "../switchboardId";
import { sessionMatchesFilter } from "./sessionMatchesFilter";

/** Visible tab order for Ctrl+Tab: Switchboard, then each session matching the filter. */
export function visibleTabOrder(
  pinned: Session[],
  unpinned: Session[],
  filterQuery: string,
): ActiveTabId[] {
  const order: ActiveTabId[] = [SWITCHBOARD_ID];
  for (const session of [...pinned, ...unpinned]) {
    if (sessionMatchesFilter(session, filterQuery)) order.push(session.id);
  }
  return order;
}
