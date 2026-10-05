import type { Session, TranscriptTurn } from "../shared/types";
import { SWITCHBOARD_ID, type ActiveTabId } from "../shared/types";
import { removeSessionFromLists, type SessionRailLists } from "./sessionRailLists";
import { loadSessionMeta, sessionFromMeta } from "./sessionMeta";
import { loadTranscript } from "./sessionTranscripts";
import { finalizeStalledTurns } from "./finalizeStalledTurns";
import type { GlobalEventBus } from "./events";

type HydrationHost = {
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

/** Load meta + transcript into memory the first time a session is opened. */
export async function ensureSessionHydrated(
  host: HydrationHost,
  sessionId: string,
): Promise<Session | null> {
  const session = host.sessions.get(sessionId);
  if (!session) return null;
  if (host.hydrated.has(sessionId)) return session;
  const meta = await loadSessionMeta(sessionId);
  if (!meta) {
    host.sessions.delete(sessionId);
    host.transcripts.delete(sessionId);
    host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
    if (host.activeParentSessionId() === sessionId || host.activeTabId === sessionId) {
      host.setActiveTabId(SWITCHBOARD_ID);
    }
    host.emitSessions();
    host.persist();
    return null;
  }
  session.title = meta.title;
  session.agent = meta.agent;
  session.cwd = meta.cwd;
  session.agentSessionId = meta.agentSessionId;
  session.usage = meta.usage;
  session.tabs = meta.tabs;
  session.tabsExpanded = meta.tabsExpanded;
  const loaded = await loadTranscript(sessionId);
  const items = finalizeStalledTurns(loaded);
  host.transcripts.set(sessionId, items);
  host.hydrated.add(sessionId);
  host.pushTranscript(sessionId);
  host.emitSessions();
  if (items !== loaded) host.queuePersist();
  return session;
}

/** Session folder missing: drop open entry + Switchboard events and tell the UI. */
export function forgetMissingSession(host: HydrationHost, sessionId: string): void {
  const title =
    host.sessions.get(sessionId)?.title ??
    host.bus.list().find((event) => event.sessionId === sessionId)?.sessionTitle ??
    "Session";
  if (host.sessions.has(sessionId)) {
    host.sessions.delete(sessionId);
    host.transcripts.delete(sessionId);
    host.hydrated.delete(sessionId);
    host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
    if (host.activeParentSessionId() === sessionId || host.activeTabId === sessionId) {
      host.setActiveTabId(SWITCHBOARD_ID);
    }
    host.emitSessions();
  }
  host.bus.removeSession(sessionId);
  host.send("switchboard:session-removed", {
    sessionId,
    message: `Session “${title}” is no longer on disk and was removed from Switchboard.`,
  });
  host.persist();
}

/** Re-open a closed-but-on-disk session onto the rail. */
export async function reopenSession(
  host: HydrationHost,
  sessionId: string,
): Promise<Session | null> {
  const meta = await loadSessionMeta(sessionId);
  if (!meta) return null;
  const loaded = await loadTranscript(sessionId);
  const items = finalizeStalledTurns(loaded);
  const session = sessionFromMeta(sessionId, meta);
  host.prependSession(session);
  host.transcripts.set(sessionId, items);
  host.hydrated.add(sessionId);
  host.pushTranscript(sessionId);
  if (items !== loaded) host.queuePersist();
  return session;
}
