import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { ActiveTabId } from "../../shared/activeTabId";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { nextActiveAfterClose } from "../railLists/nextActiveAfterClose";
import { removeSessionFromLists } from "../railLists/removeSessionFromLists";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import { metaFromSession } from "../storage/metaFromSession";
import { saveSessionMeta } from "../storage/sessionMeta";
import { saveTranscript } from "../storage/sessionTranscripts";
import type { AcpSession } from "../acp/session";
import type { GlobalEventBus } from "../events";

type SoftCloseHost = {
  sessions: Map<string, Session>;
  agents: Map<string, AcpSession>;
  transcripts: Map<string, TranscriptTurn[]>;
  hydrated: Set<string>;
  bus: GlobalEventBus;
  railLists: SessionRailLists;
  activeTabId: ActiveTabId;
  setActiveTabId: (id: ActiveTabId) => void;
  setRailLists: (lists: SessionRailLists) => void;
  send: (channel: string, payload: unknown) => void;
  refreshCommandsIfNeeded: (sessionId: string) => void;
};

/** Close a session from the rail without deleting its folder. */
export async function softCloseSession(
  host: SoftCloseHost,
  sessionId: string,
): Promise<void> {
  const session = host.sessions.get(sessionId);
  if (!session) return;
  for (const turn of host.bus.setSessionTitle(sessionId, session.title)) {
    host.send("switchboard:turn", turn);
  }
  await saveSessionMeta(sessionId, metaFromSession(session));
  if (host.hydrated.has(sessionId)) {
    await saveTranscript(sessionId, host.transcripts.get(sessionId) ?? []);
  }
  const acp = host.agents.get(sessionId);
  if (acp) {
    await acp.dispose();
    host.agents.delete(sessionId);
  }
  host.sessions.delete(sessionId);
  host.transcripts.delete(sessionId);
  host.hydrated.delete(sessionId);
  const wasActive = host.activeTabId === sessionId;
  const nextActive = wasActive ? nextActiveAfterClose(host.railLists, sessionId) : null;
  host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
  if (wasActive) {
    host.setActiveTabId(nextActive ?? SWITCHBOARD_ID);
    if (nextActive) host.refreshCommandsIfNeeded(nextActive);
  }
}
