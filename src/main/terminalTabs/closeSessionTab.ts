import { findChildTab } from "../../shared/tabNav/findChildTab";
import { removeTabFromList } from "../tabs/removeTabFromList";
import { updateTabCwd } from "../tabs/updateTabCwd";
import { activeTabAfterChildClose } from "../tabs/activeTabAfterChildClose";
import type { TerminalHostApi } from "./TerminalHostApi";

export async function closeSessionTab(host: TerminalHostApi, tabId: string): Promise<void> {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found) return;
  const closedIndex = found.session.tabs.findIndex((tab) => tab.tabId === tabId);
  const cwd = await host.terminals.refreshCwd(tabId);
  host.terminals.dispose(tabId);
  let tabs = found.session.tabs;
  if (cwd) tabs = updateTabCwd(tabs, tabId, cwd);
  const next = removeTabFromList(tabs, tabId);
  if (!next) return;
  found.session.tabs = next;
  if (host.getActiveTabId() === tabId) {
    const activeId = activeTabAfterChildClose(next, closedIndex, found.session.id);
    host.setActiveTabId(activeId);
    if (activeId === found.session.id) {
      host.refreshCommandsIfNeeded(found.session.id);
    }
  }
  host.emitSessions();
  host.persist();
}
