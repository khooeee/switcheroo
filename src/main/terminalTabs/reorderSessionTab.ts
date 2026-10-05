import { reorderTabInList } from "../tabs/reorderTabInList";
import type { TerminalHostApi } from "./TerminalHostApi";

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
