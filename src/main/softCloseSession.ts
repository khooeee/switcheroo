import type { Session } from "../shared/session";
import type { TranscriptTurn } from "../shared/transcript";
import type { ActiveTabId } from "../shared/activeTabId";
import { SWITCHBOARD_ID } from "../shared/switchboardId";
import { nextActiveAfterClose } from "./railLists/nextActiveAfterClose";
import { removeSessionFromLists } from "./railLists/removeSessionFromLists";
import type { SessionRailLists } from "./railLists/SessionRailLists";
import { metaFromSession } from "./metaFromSession";
import { saveSessionMeta } from "./sessionMeta";
import { saveTranscript } from "./sessionTranscripts";
import { updateTabCwd } from "./tabs/updateTabCwd";
import type { AcpSession } from "./acp/session";
import type { GlobalEventBus } from "./events";
import type { TerminalHost } from "./terminalHost";

type SoftCloseHost = {
  sessions: Map<string, Session>;
  agents: Map<string, AcpSession>;
  transcripts: Map<string, TranscriptTurn[]>;
  hydrated: Set<string>;
  terminals: TerminalHost;
  bus: GlobalEventBus;
  railLists: SessionRailLists;
  activeTabId: ActiveTabId;
  setActiveTabId: (id: ActiveTabId) => void;
  setRailLists: (lists: SessionRailLists) => void;
  send: (channel: string, payload: unknown) => void;
  refreshCommandsIfNeeded: (sessionId: string) => void;
  activeParentSessionId: () => string | null;
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
  const tabIds = session.tabs.map((tab) => tab.tabId);
  const cwds = await host.terminals.disposeMany(tabIds);
  if (cwds.size > 0) {
    let tabs = session.tabs;
    for (const [tabId, cwd] of cwds) tabs = updateTabCwd(tabs, tabId, cwd);
    session.tabs = tabs;
  }
  if (host.hydrated.has(sessionId)) {
    await saveSessionMeta(sessionId, metaFromSession(session));
    await saveTranscript(sessionId, host.transcripts.get(sessionId) ?? []);
  } else {
    await saveSessionMeta(sessionId, metaFromSession(session));
  }
  const acp = host.agents.get(sessionId);
  if (acp) {
    await acp.dispose();
    host.agents.delete(sessionId);
  }
  host.sessions.delete(sessionId);
  host.transcripts.delete(sessionId);
  host.hydrated.delete(sessionId);
  const activeParent = host.activeParentSessionId();
  const wasActive = activeParent === sessionId || host.activeTabId === sessionId;
  const nextActive = wasActive ? nextActiveAfterClose(host.railLists, sessionId) : null;
  host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
  if (wasActive) {
    host.setActiveTabId(nextActive ?? SWITCHBOARD_ID);
    if (host.activeTabId !== SWITCHBOARD_ID && host.sessions.has(host.activeTabId)) {
      host.refreshCommandsIfNeeded(host.activeTabId);
    }
  }
}
