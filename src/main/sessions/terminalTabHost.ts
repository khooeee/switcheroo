import type { SessionDeps } from "./SessionDeps";

/** Adapter exposing SessionManager state to the terminalTabs/ operations. */
export function terminalTabHost({ state, persistence, agents }: SessionDeps) {
  return {
    sessions: state.sessions,
    terminals: state.terminals,
    getActiveTabId: () => state.activeTabId,
    setActiveTabId: (id: string) => { state.activeTabId = id; },
    emitSessions: () => state.emitSessions(),
    persist: () => { void persistence.persist(); },
    refreshCommandsIfNeeded: (sessionId: string) => agents.refreshCommandsIfNeeded(sessionId),
  };
}
