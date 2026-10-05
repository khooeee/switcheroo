import type { Session } from "../../shared/session";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { removeSessionFromLists } from "../railLists/removeSessionFromLists";
import { loadSessionMeta } from "../sessionMeta";
import { loadTranscript } from "../sessionTranscripts";
import { finalizeStalledTurns } from "../finalizeStalledTurns";
import type { HydrationHost } from "./HydrationHost";

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
