import type { SessionState } from "./SessionState";
import type { SessionPersistence } from "./SessionPersistence";
import type { SessionHydration } from "./SessionHydration";
import type { SessionAgents } from "./SessionAgents";

/** Collaborators SessionManager passes to its extracted operations. */
export type SessionDeps = {
  state: SessionState;
  persistence: SessionPersistence;
  hydration: SessionHydration;
  agents: SessionAgents;
};
