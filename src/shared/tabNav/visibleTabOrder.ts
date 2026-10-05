import type { ActiveTabId } from "../activeTabId";
import type { Session } from "../session";
import { SWITCHBOARD_ID } from "../switchboardId";
import { groupMatchesFilter } from "./groupMatchesFilter";
import { visibleChildren } from "./visibleChildren";

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
