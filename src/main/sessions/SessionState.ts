import type { BrowserWindow } from "electron";
import type { ActiveTabId } from "../../shared/activeTabId";
import type { AgentKind } from "../../shared/agentKind";
import type { Session } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { GlobalEventBus } from "../events";
import type { AcpSession } from "../acp/session";
import { WarmSessionPool } from "../acp/WarmSessionPool";
import { AgentForkSupport } from "../acp/AgentForkSupport";
import { activeParentSessionId } from "../menuState/activeParentSessionId";
import { prependPinnedInLists } from "../railLists/prependPinnedInLists";
import { prependUnpinnedInLists } from "../railLists/prependUnpinnedInLists";
import type { SessionRailLists } from "../railLists/SessionRailLists";
import { TerminalHost } from "../terminalHost";
import { SubagentTranscriptStore } from "./SubagentTranscriptStore";

/** In-memory session state shared by SessionManager collaborators, plus renderer IPC. */
export class SessionState {
  sessions = new Map<string, Session>();
  railLists: SessionRailLists = { pinnedIds: [], unpinnedIds: [] };
  agents = new Map<string, AcpSession>();
  transcripts = new Map<string, TranscriptTurn[]>();
  subagentTranscripts = new SubagentTranscriptStore();
  hydrated = new Set<string>();
  activeTabId: ActiveTabId = SWITCHBOARD_ID;
  bus = new GlobalEventBus();
  window: BrowserWindow | null = null;
  permissionOwners = new Map<string, string>(); // requestId -> sessionId
  askOwners = new Map<string, string>();
  warm = new WarmSessionPool<AcpSession>();
  forkSupport = new AgentForkSupport();
  terminals = new TerminalHost();
  onSessionsChanged: (() => void) | null = null;

  setActiveTabId(id: ActiveTabId): void {
    this.activeTabId = id;
  }

  setRailLists(lists: SessionRailLists): void {
    this.railLists = lists;
  }

  menuCtx() {
    return {
      activeTabId: this.activeTabId,
      sessions: this.sessions,
      pinnedIds: this.railLists.pinnedIds,
      supportsFork: (agent: AgentKind) => this.forkSupport.flags(agent).supportsFork,
    };
  }

  activeParentSessionId(): string | null {
    return activeParentSessionId(this.menuCtx());
  }

  prependSession(session: Session, pin = false): void {
    this.sessions.set(session.id, session);
    this.railLists = pin
      ? prependPinnedInLists(this.railLists, session.id)
      : prependUnpinnedInLists(this.railLists, session.id);
  }

  bumpSession(sessionId: string): void {
    this.railLists = this.railLists.pinnedIds.includes(sessionId)
      ? prependPinnedInLists(this.railLists, sessionId)
      : prependUnpinnedInLists(this.railLists, sessionId);
  }

  sessionListPayload() {
    const map = (ids: string[]) =>
      ids
        .map((id) => this.sessions.get(id))
        .filter((session): session is Session => !!session)
        .map((session) => ({ ...session, ...this.forkSupport.flags(session.agent) }));
    return {
      pinned: map(this.railLists.pinnedIds),
      unpinned: map(this.railLists.unpinnedIds),
      activeTabId: this.activeTabId,
    };
  }

  emitSessions(): void {
    this.send("sessions:changed", this.sessionListPayload());
    this.onSessionsChanged?.();
  }

  /** Push the in-memory transcript so the renderer cannot show a stale empty list. */
  pushTranscript(sessionId: string): void {
    this.send("transcript:reset", {
      sessionId,
      turns: this.transcripts.get(sessionId) ?? [],
    });
  }

  send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}
