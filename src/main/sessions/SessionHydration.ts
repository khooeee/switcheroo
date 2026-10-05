import type { ActiveTabId } from "../../shared/activeTabId";
import type { Session } from "../../shared/session";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import { ensureSessionHydrated } from "../hydration/ensureSessionHydrated";
import { forgetMissingSession } from "../hydration/forgetMissingSession";
import { reopenSession } from "../hydration/reopenSession";
import type { SessionState } from "./SessionState";
import type { SessionPersistence } from "./SessionPersistence";

/** Loads sessions from disk on demand and drops ones whose folder is gone. */
export class SessionHydration {
  constructor(
    private readonly state: SessionState,
    private readonly persistence: SessionPersistence,
  ) {}

  ensure(sessionId: string): Promise<Session | null> {
    return ensureSessionHydrated(this.host(), sessionId);
  }

  forgetMissing(sessionId: string): void {
    forgetMissingSession(this.host(), sessionId);
  }

  reopen(sessionId: string): Promise<Session | null> {
    return reopenSession(this.host(), sessionId);
  }

  private host() {
    const { state, persistence } = this;
    return {
      sessions: state.sessions,
      transcripts: state.transcripts,
      hydrated: state.hydrated,
      bus: state.bus,
      get railLists() { return state.railLists; },
      get activeTabId() { return state.activeTabId; },
      setActiveTabId: (id: ActiveTabId) => state.setActiveTabId(id),
      setRailLists: (lists: SessionRailLists) => state.setRailLists(lists),
      emitSessions: () => state.emitSessions(),
      persist: () => { void persistence.persist(); },
      queuePersist: () => persistence.queuePersist(),
      pushTranscript: (sessionId: string) => state.pushTranscript(sessionId),
      send: (channel: string, payload: unknown) => state.send(channel, payload),
      activeParentSessionId: () => state.activeParentSessionId(),
      prependSession: (session: Session, pin?: boolean) => state.prependSession(session, pin),
    };
  }
}
