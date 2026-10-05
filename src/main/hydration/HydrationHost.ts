import type { ActiveTabId } from "../../shared/activeTabId";
import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import type { GlobalEventBus } from "../events";

/** Session state that hydration reads and mutates. */
export type HydrationHost = {
  sessions: Map<string, Session>;
  transcripts: Map<string, TranscriptTurn[]>;
  hydrated: Set<string>;
  bus: GlobalEventBus;
  get railLists(): SessionRailLists;
  get activeTabId(): ActiveTabId;
  setActiveTabId: (id: ActiveTabId) => void;
  setRailLists: (lists: SessionRailLists) => void;
  emitSessions: () => void;
  persist: () => void;
  queuePersist: () => void;
  pushTranscript: (sessionId: string) => void;
  send: (channel: string, payload: unknown) => void;
  activeParentSessionId: () => string | null;
  prependSession: (session: Session, pin?: boolean) => void;
};
