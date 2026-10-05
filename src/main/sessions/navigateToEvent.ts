import type { SessionDeps } from "./SessionDeps";

/** Open (or reopen) a session and scroll the renderer to one event. */
export async function navigateToEvent(
  { state, persistence, hydration, agents }: SessionDeps,
  sessionId: string,
  turnId: string,
  eventId: string,
): Promise<void> {
  if (!state.sessions.has(sessionId)) {
    const reopened = await hydration.reopen(sessionId);
    if (!reopened) {
      hydration.forgetMissing(sessionId);
      return;
    }
  } else if (!(await hydration.ensure(sessionId))) {
    hydration.forgetMissing(sessionId);
    return;
  }
  state.activeTabId = sessionId;
  state.emitSessions();
  state.pushTranscript(sessionId);
  state.send("navigate-event", { sessionId, turnId, eventId });
  void persistence.persist();
  agents.refreshCommandsIfNeeded(sessionId);
}
