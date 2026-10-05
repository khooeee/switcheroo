import type { ActiveTabId } from "../../shared/activeTabId";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { findChildTab } from "../../shared/tabNav/findChildTab";
import type { SessionDeps } from "./SessionDeps";

/** Select Switchboard, a session, or a child tab, hydrating its session first. */
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
  if (state.sessions.has(tabId)) {
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
    return;
  }
  const child = findChildTab(state.sessions.values(), tabId);
  if (!child) return;
  const session = await hydration.ensure(child.session.id);
  if (!session) {
    hydration.forgetMissing(child.session.id);
    return;
  }
  if (!session.tabsExpanded) session.tabsExpanded = true;
  state.activeTabId = tabId;
  state.emitSessions();
  void persistence.persist();
}
