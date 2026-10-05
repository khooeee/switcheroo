import type { SessionTab } from "../../shared/session";
import { createTerminalTab } from "../tabs/createTerminalTab";
import type { TerminalHostApi } from "./TerminalHostApi";

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
