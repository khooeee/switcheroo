import type { Session, SessionTab } from "../shared/types";
import { findChildTab } from "../shared/tabNav";
import {
  createTerminalTab,
  moveTabBetweenLists,
  removeTabFromList,
  renameTabInList,
  reorderTabInList,
  updateTabCwd,
  activeTabAfterChildClose,
} from "./sessionTabs";
import type { TerminalHost } from "./terminalHost";

type TerminalHostApi = {
  sessions: Map<string, Session>;
  terminals: TerminalHost;
  getActiveTabId: () => string;
  setActiveTabId: (id: string) => void;
  emitSessions: () => void;
  persist: () => void;
  refreshCommandsIfNeeded: (sessionId: string) => void;
};

export async function createSessionTerminalTab(
  host: TerminalHostApi,
  sessionId: string,
): Promise<SessionTab> {
  const session = host.sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  const tab = createTerminalTab(session.cwd, session.tabs);
  session.tabs = [...session.tabs, tab];
  session.tabsExpanded = true;
  host.setActiveTabId(tab.tabId);
  host.emitSessions();
  host.persist();
  return tab;
}

export function renameSessionTab(host: TerminalHostApi, tabId: string, title: string): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found) return;
  const next = renameTabInList(found.session.tabs, tabId, title);
  if (!next) return;
  found.session.tabs = next;
  host.emitSessions();
  host.persist();
}

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

export function setSessionTabsExpanded(
  host: TerminalHostApi,
  sessionId: string,
  expanded: boolean,
): void {
  const session = host.sessions.get(sessionId);
  if (!session) return;
  session.tabsExpanded = expanded;
  host.emitSessions();
  host.persist();
}

export function reorderSessionTab(
  host: TerminalHostApi,
  sessionId: string,
  tabId: string,
  toIndex: number,
): void {
  const session = host.sessions.get(sessionId);
  if (!session) return;
  const next = reorderTabInList(session.tabs, tabId, toIndex);
  if (!next) return;
  session.tabs = next;
  host.emitSessions();
  host.persist();
}

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

export function attachSessionTerminal(host: TerminalHostApi, tabId: string): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found || found.tab.kind !== "terminal") return;
  host.terminals.ensure(tabId, found.tab.cwd || found.session.cwd);
}

export function applySessionTerminalCwd(
  host: Pick<TerminalHostApi, "sessions" | "emitSessions">,
  tabId: string,
  cwd: string,
): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found || found.tab.kind !== "terminal") return;
  if (found.tab.cwd === cwd) return;
  found.session.tabs = updateTabCwd(found.session.tabs, tabId, cwd);
  host.emitSessions();
}
