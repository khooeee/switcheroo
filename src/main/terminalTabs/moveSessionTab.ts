import { findChildTab } from "../../shared/tabNav/findChildTab";
import { moveTabBetweenLists } from "../tabs/moveTabBetweenLists";
import type { TerminalHostApi } from "./TerminalHostApi";
import { reorderSessionTab } from "./reorderSessionTab";

export function moveSessionTab(
  host: TerminalHostApi,
  tabId: string,
  toSessionId: string,
  toIndex: number,
): void {
  const found = findChildTab(host.sessions.values(), tabId);
  const dest = host.sessions.get(toSessionId);
  if (!found || !dest) return;
  if (found.session.id === toSessionId) {
    reorderSessionTab(host, toSessionId, tabId, toIndex);
    return;
  }
  const moved = moveTabBetweenLists(found.session.tabs, dest.tabs, tabId, toIndex);
  if (!moved) return;
  found.session.tabs = moved.from;
  dest.tabs = moved.to;
  dest.tabsExpanded = true;
  host.emitSessions();
  host.persist();
}
