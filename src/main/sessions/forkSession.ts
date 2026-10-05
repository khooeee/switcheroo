import type { Session } from "../../shared/session";
import { forkSessionAtEvent } from "../forkSessionAtEvent";
import type { SessionDeps } from "./SessionDeps";

/** Fork a session (optionally at an event) into a new rail entry next to it. */
export async function forkSession(
  { state, persistence, hydration, agents }: SessionDeps,
  sessionId: string,
  eventId?: string,
): Promise<Session> {
  if (!(await hydration.ensure(sessionId))) throw new Error("Session not found");
  return forkSessionAtEvent({
    getSession: (id) => state.sessions.get(id),
    getTranscript: (id) => state.transcripts.get(id) ?? [],
    listTitles: () => [...state.sessions.values()].map((session) => session.title),
    ensureSession: async (session) => agents.ensureSession(session),
    forkSupport: (agent) => state.forkSupport.flags(agent),
    callbacksFor: (session) => agents.callbacksFor(session),
    setSession: (id, session) => { state.agents.set(id, session); },
    addSession: (session, transcript) => {
      const pin = state.railLists.pinnedIds.includes(sessionId);
      state.prependSession(session, pin);
      state.transcripts.set(session.id, transcript);
      state.hydrated.add(session.id);
    },
    setActiveSession: (id) => { state.activeTabId = id; },
    emitSessions: () => state.emitSessions(),
    send: (channel, payload) => state.send(channel, payload),
    persist: () => persistence.persist(),
  }, sessionId, eventId);
}
