import type { TerminalHostApi } from "./TerminalHostApi";

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
