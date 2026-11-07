import type { ActiveTabId } from "../../shared/activeTabId";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import type { SessionDeps } from "./SessionDeps";

/** Select Switchboard or a session, hydrating the session first. */
export async function setActiveTab(
  { state, persistence, hydration, agents }: SessionDeps,
  tabId: ActiveTabId,
): Promise<void> {
  if (tabId === SWITCHBOARD_ID) {
    state.activeTabId = SWITCHBOARD_ID;
    state.emitSessions();
    void persistence.persist();
    return;
  }
  if (!state.sessions.has(tabId)) return;
  const session = await hydration.ensure(tabId);
  if (!session) {
    hydration.forgetMissing(tabId);
    return;
  }
  state.pushTranscript(tabId);
  state.activeTabId = tabId;
  state.emitSessions();
  void persistence.persist();
  agents.refreshCommandsIfNeeded(tabId);
}
