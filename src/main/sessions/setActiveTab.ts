import type { SessionDeps } from "./SessionDeps";

/** Select a session, hydrating it first. */
export async function setActiveTab(
  { state, persistence, hydration, agents }: SessionDeps,
  tabId: string,
): Promise<void> {
  if (!state.sessions.has(tabId)) return;
  if (!(await hydration.ensure(tabId))) return;
  state.pushTranscript(tabId);
  state.activeTabId = tabId;
  state.emitSessions();
  void persistence.persist();
  agents.refreshCommandsIfNeeded(tabId);
}
