import type { ActiveTabId } from "../../shared/activeTabId";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import type { SessionDeps } from "./SessionDeps";

/** Adapter exposing SessionManager state to softCloseSession. */
export function softCloseHost({ state, agents }: SessionDeps) {
  return {
    sessions: state.sessions,
    agents: state.agents,
    transcripts: state.transcripts,
    hydrated: state.hydrated,
    terminals: state.terminals,
    bus: state.bus,
    get railLists() { return state.railLists; },
    get activeTabId() { return state.activeTabId; },
    setActiveTabId: (id: ActiveTabId) => state.setActiveTabId(id),
    setRailLists: (lists: SessionRailLists) => state.setRailLists(lists),
    send: (channel: string, payload: unknown) => state.send(channel, payload),
    refreshCommandsIfNeeded: (sessionId: string) => agents.refreshCommandsIfNeeded(sessionId),
    activeParentSessionId: () => state.activeParentSessionId(),
  };
}
