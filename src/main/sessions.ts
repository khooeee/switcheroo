import * as path from "node:path";
import type { BrowserWindow } from "electron";
import type {
  ActiveTabId,
  AgentKind,
  AppSettings,
  CreateSessionInput,
  SwitchboardTurn,
  PersistedState,
  Session,
  SessionStatus,
  SessionTab,
  TranscriptTurn,
} from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { findChildTab } from "../shared/tabNav";
import { GlobalEventBus } from "./events";
import { AcpSession } from "./acp/session";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { agentLabel } from "./acp/presets";
import { loadState, saveState } from "./persist";
import { getAppSettings, hydrateAppSettings, patchAppSettings } from "./appSettings";
import {
  loadSessionMeta,
  saveSessionMeta,
  sessionFromMeta,
  metaFromSession,
} from "./sessionMeta";
import { saveTranscript } from "./sessionTranscripts";
import { loadSwitchboardTurns, saveSwitchboardTurns } from "./switchboardEvents";
import { finalizeStalledTurns } from "./finalizeStalledTurns";
import { switchboardCleanupCutoff } from "./switchboardCleanup";
import { overflowSessionIds } from "./overflowSessionIds";
import {
  loadListsFromPersisted,
  pinSessionInLists,
  prependPinnedInLists,
  prependUnpinnedInLists,
  unpinSessionInLists,
  type SessionRailLists,
} from "./sessionRailLists";
import { formatAgentError } from "../shared/formatAgentError";
import { forkSessionAtEvent } from "./forkSessionAtEvent";
import { runFindInSessions } from "./runFindInSessions";
import { controlBootstrapText } from "./acp/controlBootstrapPrompt";
import { newSessionId } from "./newSessionId";
import { WarmSessionPool } from "./acp/WarmSessionPool";
import { AgentForkSupport } from "./acp/AgentForkSupport";
import type { SessionPinMenuState } from "./sessionPinMenuState";
import {
  activeForkMenuEnabled,
  activeIsChildTab,
  activeNewTerminalMenuEnabled,
  activeOpenInCursorEnabled,
  activeParentSessionId,
  activePinMenuState,
  activeRenameMenuEnabled,
  activeStopMenuEnabled,
  activeUnreadMenuEnabled,
} from "./activeSessionMenus";
import { buildSessionCallbacks } from "./buildSessionCallbacks";
import { softCloseSession } from "./softCloseSession";
import {
  ensureSessionHydrated,
  forgetMissingSession,
  reopenSession,
} from "./sessionHydration";
import { updateTabCwd } from "./sessionTabs";
import {
  applySessionTerminalCwd,
  attachSessionTerminal,
  closeSessionTab,
  createSessionTerminalTab,
  moveSessionTab,
  renameSessionTab,
  reorderSessionTab,
  setSessionTabsExpanded,
} from "./sessionTerminalTabs";
import { TerminalHost } from "./terminalHost";
import { openFolderInCursor } from "./openInCursor";

const warmCallbacks: SessionCallbacks = {
  onPromptComplete: () => undefined,
  onSteeringSupport: () => undefined,
  onForkSupport: () => undefined,
  onAvailableCommands: () => undefined,
  onUsage: () => undefined,
  onTurn: () => undefined,
  onStatus: () => undefined,
  onPermission: () => undefined,
  onAskQuestion: () => undefined,
  getSessionTitle: () => "Warm",
};

export class SessionManager {
  private sessions = new Map<string, Session>();
  private railLists: SessionRailLists = { pinnedIds: [], unpinnedIds: [] };
  private agents = new Map<string, AcpSession>();
  private transcripts = new Map<string, TranscriptTurn[]>();
  private hydrated = new Set<string>();
  private activeTabId: ActiveTabId = SWITCHBOARD_ID;
  private bus = new GlobalEventBus();
  private window: BrowserWindow | null = null;
  private permissionOwners = new Map<string, string>(); // requestId -> sessionId
  private askOwners = new Map<string, string>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private findGeneration = 0;
  private warm = new WarmSessionPool<AcpSession>();
  private forkSupport = new AgentForkSupport();
  private terminals = new TerminalHost();
  private onSessionsChanged: (() => void) | null = null;

  setWindow(win: BrowserWindow): void {
    this.window = win;
    this.terminals.setListeners(
      (tabId, data) => this.send("terminal:data", { tabId, data }),
      (tabId) => {
        this.send("terminal:exit", { tabId });
        void this.closeTab(tabId);
      },
      (tabId, cwd) => this.applyTerminalCwd(tabId, cwd),
    );
    const parentId = this.activeParentSessionId();
    if (parentId) this.refreshCommandsIfNeeded(parentId);
  }

  setOnSessionsChanged(cb: (() => void) | null): void {
    this.onSessionsChanged = cb;
  }

  private menuCtx() {
    return {
      activeTabId: this.activeTabId,
      sessions: this.sessions,
      pinnedIds: this.railLists.pinnedIds,
      supportsFork: (agent: AgentKind) => this.forkSupport.flags(agent).supportsFork,
    };
  }

  /** Label/enabled for Session → Pin/Unpin based on the active chat parent. */
  activePinMenuState(): SessionPinMenuState {
    return activePinMenuState(this.menuCtx());
  }

  /** Rename enabled for parent or child tab. */
  activeRenameMenuEnabled(): boolean {
    return activeRenameMenuEnabled(this.menuCtx());
  }

  /** Unread is parent-only. */
  activeUnreadMenuEnabled(): boolean {
    return activeUnreadMenuEnabled(this.menuCtx());
  }

  /** True when active selection is a child terminal tab. */
  activeIsChildTab(): boolean {
    return activeIsChildTab(this.menuCtx());
  }

  activeForkMenuEnabled(): boolean {
    return activeForkMenuEnabled(this.menuCtx());
  }

  activeStopMenuEnabled(): boolean {
    return activeStopMenuEnabled(this.menuCtx());
  }

  activeNewTerminalMenuEnabled(): boolean {
    return activeNewTerminalMenuEnabled(this.menuCtx());
  }

  /** Open in Cursor uses the active chat group's project folder. */
  activeOpenInCursorEnabled(): boolean {
    return activeOpenInCursorEnabled(this.menuCtx());
  }

  async openActiveInCursor(): Promise<void> {
    const parentId = activeParentSessionId(this.menuCtx());
    if (!parentId) return;
    const session = this.sessions.get(parentId);
    if (!session?.cwd.trim()) return;
    await openFolderInCursor(session.cwd);
  }

  private activeParentSessionId(): string | null {
    return activeParentSessionId(this.menuCtx());
  }

  async init(): Promise<void> {
    const saved = await loadState();
    hydrateAppSettings(saved?.settings);
    if (saved) {
      const { lists, openIds } = loadListsFromPersisted(saved.pinned, saved.unpinned);
      this.railLists = lists;
      await Promise.all(
        openIds.map(async (id) => {
          const meta = await loadSessionMeta(id);
          this.sessions.set(id, sessionFromMeta(id, meta));
        }),
      );
      this.activeTabId = this.resolveActiveTabId(saved.activeTabId, openIds);
      const openSessionIds = new Set(openIds);
      const loadedSwitchboard = await loadSwitchboardTurns();
      const switchboardTurns = finalizeStalledTurns(loadedSwitchboard);
      const navigableIds = new Set(openSessionIds);
      const titles = new Map<string, string>(
        [...this.sessions.entries()].map(([id, session]) => [id, session.title]),
      );
      const closedIds = [
        ...new Set(switchboardTurns.map((e) => e.sessionId)),
      ].filter((id) => id && !openSessionIds.has(id));
      await Promise.all(
        closedIds.map(async (sessionId) => {
          const meta = await loadSessionMeta(sessionId);
          if (!meta) return;
          navigableIds.add(sessionId);
          titles.set(sessionId, meta.title);
        }),
      );
      this.bus.restore(
        switchboardTurns.map((e) => ({
          ...e,
          sessionTitle: titles.get(e.sessionId) ?? e.sessionTitle,
          navigable: navigableIds.has(e.sessionId),
        })),
      );
      const parentId = this.activeParentSessionId();
      if (parentId) await this.ensureHydrated(parentId);
      if (switchboardTurns !== loadedSwitchboard) await saveSwitchboardTurns(this.bus.list());
    }

    this.bus.on("turn", (turn: SwitchboardTurn) => {
      this.send("switchboard:turn", turn);
    });
    if (await this.enforceSessionListMax()) await this.persistStateFile();
    await this.maybeCleanSwitchboard();
    this.ensureWarm(getAppSettings().lastAgent, getAppSettings().lastCwd);
  }

  private resolveActiveTabId(saved: ActiveTabId, openIds: string[]): ActiveTabId {
    if (saved === SWITCHBOARD_ID) return SWITCHBOARD_ID;
    if (openIds.includes(saved)) return saved;
    for (const id of openIds) {
      const session = this.sessions.get(id);
      if (session?.tabs.some((tab) => tab.tabId === saved)) return saved;
    }
    return SWITCHBOARD_ID;
  }

  async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.persistTerminalCwds();
    await this.persistStateFile();
    await saveSwitchboardTurns(this.bus.list());
    await Promise.all(
      [...this.sessions.values()].map(async (session) => {
        await saveSessionMeta(session.id, metaFromSession(session));
        if (!this.hydrated.has(session.id)) return;
        await saveTranscript(session.id, this.transcripts.get(session.id) ?? []);
      }),
    );
  }

  private async persistTerminalCwds(): Promise<void> {
    for (const session of this.sessions.values()) {
      let changed = false;
      let tabs = session.tabs;
      for (const tab of session.tabs) {
        if (tab.kind !== "terminal" || !this.terminals.has(tab.tabId)) continue;
        const cwd = await this.terminals.refreshCwd(tab.tabId);
        if (!cwd || cwd === tab.cwd) continue;
        tabs = updateTabCwd(tabs, tab.tabId, cwd);
        changed = true;
      }
      if (changed) session.tabs = tabs;
    }
  }

  getSettings(): AppSettings {
    return getAppSettings();
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    const next = patchAppSettings(patch);
    void this.persistStateFile();
    return next;
  }

  private async persistStateFile(): Promise<void> {
    const state: PersistedState = {
      version: 1,
      activeTabId: this.activeTabId,
      settings: getAppSettings(),
      pinned: [...this.railLists.pinnedIds],
      unpinned: [...this.railLists.unpinnedIds],
    };
    await saveState(state);
  }

  /** Age-out old Switchboard turns on startup. */
  private async maybeCleanSwitchboard(): Promise<void> {
    const cutoff = switchboardCleanupCutoff(getAppSettings().cleanSwitchboardTurnsOlderThanDays);
    if (cutoff == null) return;
    const removed = this.bus.removeOlderThan(cutoff);
    if (removed === 0) return;
    this.send("switchboard:turns", this.bus.list());
    await saveSwitchboardTurns(this.bus.list());
  }

  /** Soft-close oldest rail sessions on startup when over sessionListMax. */
  private async enforceSessionListMax(): Promise<boolean> {
    const parentId = this.activeParentSessionId();
    const protect = parentId ?? undefined;
    const max = getAppSettings().sessionListMax;
    const unpinnedCap = Math.max(0, max - this.railLists.pinnedIds.length);
    const toClose = overflowSessionIds(
      this.railLists.unpinnedIds,
      unpinnedCap,
      protect,
    );
    if (toClose.length === 0) return false;
    for (const id of toClose) await softCloseSession(this.softCloseHost(), id);
    this.emitSessions();
    return true;
  }

  private softCloseHost() {
    const mgr = this;
    return {
      sessions: mgr.sessions,
      agents: mgr.agents,
      transcripts: mgr.transcripts,
      hydrated: mgr.hydrated,
      terminals: mgr.terminals,
      bus: mgr.bus,
      get railLists() { return mgr.railLists; },
      get activeTabId() { return mgr.activeTabId; },
      setActiveTabId: (id: ActiveTabId) => { mgr.activeTabId = id; },
      setRailLists: (lists: SessionRailLists) => { mgr.railLists = lists; },
      send: (channel: string, payload: unknown) => mgr.send(channel, payload),
      refreshCommandsIfNeeded: (sessionId: string) => mgr.refreshCommandsIfNeeded(sessionId),
      activeParentSessionId: () => mgr.activeParentSessionId(),
    };
  }

  list() {
    return {
      ...this.sessionListPayload(),
      switchboardTurns: this.bus.list(),
    };
  }

  pinSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;
    this.railLists = pinSessionInLists(this.railLists, sessionId);
    this.emitSessions();
    void this.persist();
    return this.railLists.pinnedIds.includes(sessionId);
  }

  unpinSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) return;
    this.railLists = unpinSessionInLists(this.railLists, sessionId);
    this.emitSessions();
    void this.persist();
  }

  /** `focus: false` adds the session to the rail without switching to it (control API). */
  async createSession(
    input: CreateSessionInput,
    { focus = true }: { focus?: boolean } = {},
  ): Promise<Session> {
    const id = newSessionId();
    const title =
      input.title ??
      `${agentLabel(input.agent)} · ${path.basename(input.cwd)}`;
    const session: Session = {
      id,
      title,
      agent: input.agent,
      cwd: input.cwd,
      agentSessionId: null,
      status: "connecting",
      error: null,
      createdAt: Date.now(),
      tabs: [],
      tabsExpanded: true,
    };
    this.prependSession(session, input.pin === true);
    this.transcripts.set(id, []);
    this.hydrated.add(id);
    if (focus) this.activeTabId = id;
    this.emitSessions();

    try {
      const claimed = await this.warm.claim(input.agent, input.cwd);
      if (claimed) {
        claimed.adopt(id, this.callbacksFor(session));
        this.agents.set(id, claimed);
        session.agentSessionId = claimed.sessionId;
        this.setStatus(id, "ready", null);
        if (input.switcherooAware) {
          await claimed.prompt(controlBootstrapText());
        }
      } else {
        const acp = this.openSession(session);
        this.agents.set(id, acp);
        await acp.start();
        session.agentSessionId = acp.sessionId;
        this.emitSessions();
        if (input.switcherooAware) {
          await acp.prompt(controlBootstrapText());
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus(id, "error", msg);
    }

    this.ensureWarm(input.agent, input.cwd);
    void this.persist();
    return session;
  }

  async forkSession(sessionId: string, eventId?: string): Promise<Session> {
    if (!(await this.ensureHydrated(sessionId))) throw new Error("Session not found");
    return forkSessionAtEvent({
      getSession: (id) => this.sessions.get(id),
      getTranscript: (id) => this.transcripts.get(id) ?? [],
      listTitles: () => [...this.sessions.values()].map((session) => session.title),
      ensureSession: async (session) => this.ensureSession(session),
      forkSupport: (agent) => this.forkSupport.flags(agent),
      callbacksFor: (session) => this.callbacksFor(session),
      setSession: (id, session) => { this.agents.set(id, session); },
      addSession: (session, transcript) => {
        const pin = this.railLists.pinnedIds.includes(sessionId);
        this.prependSession(session, pin);
        this.transcripts.set(session.id, transcript);
        this.hydrated.add(session.id);
      },
      setActiveSession: (id) => { this.activeTabId = id; },
      emitSessions: () => this.emitSessions(),
      send: (channel, payload) => this.send(channel, payload),
      persist: () => this.persist(),
    }, sessionId, eventId);
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) return;
    await softCloseSession(this.softCloseHost(), sessionId);
    this.emitSessions();
    void this.persist();
  }

  renameSession(sessionId: string, title: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.title = title;
    for (const turn of this.bus.setSessionTitle(sessionId, title)) {
      this.send("switchboard:turn", turn);
    }
    this.emitSessions();
    void this.persist();
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  private terminalHost() {
    return {
      sessions: this.sessions,
      terminals: this.terminals,
      getActiveTabId: () => this.activeTabId,
      setActiveTabId: (id: string) => { this.activeTabId = id; },
      emitSessions: () => this.emitSessions(),
      persist: () => { void this.persist(); },
      refreshCommandsIfNeeded: (sessionId: string) => this.refreshCommandsIfNeeded(sessionId),
    };
  }

  async createTerminalTab(sessionId: string): Promise<SessionTab> {
    return createSessionTerminalTab(this.terminalHost(), sessionId);
  }

  renameTab(tabId: string, title: string): void {
    renameSessionTab(this.terminalHost(), tabId, title);
  }

  async closeTab(tabId: string): Promise<void> {
    await closeSessionTab(this.terminalHost(), tabId);
  }

  setTabsExpanded(sessionId: string, expanded: boolean): void {
    setSessionTabsExpanded(this.terminalHost(), sessionId, expanded);
  }

  reorderTab(sessionId: string, tabId: string, toIndex: number): void {
    reorderSessionTab(this.terminalHost(), sessionId, tabId, toIndex);
  }

  moveTab(tabId: string, toSessionId: string, toIndex: number): void {
    moveSessionTab(this.terminalHost(), tabId, toSessionId, toIndex);
  }

  attachTerminal(tabId: string): void {
    attachSessionTerminal(this.terminalHost(), tabId);
  }

  private applyTerminalCwd(tabId: string, cwd: string): void {
    applySessionTerminalCwd(this.terminalHost(), tabId, cwd);
  }

  writeTerminal(tabId: string, data: string): void {
    this.terminals.write(tabId, data);
  }

  resizeTerminal(tabId: string, cols: number, rows: number): void {
    this.terminals.resize(tabId, cols, rows);
  }

  async setActiveTab(tabId: ActiveTabId): Promise<void> {
    if (tabId === SWITCHBOARD_ID) {
      this.activeTabId = SWITCHBOARD_ID;
      this.emitSessions();
      void this.persist();
      return;
    }
    if (this.sessions.has(tabId)) {
      const session = await this.ensureHydrated(tabId);
      if (!session) {
        this.forgetMissingSession(tabId);
        return;
      }
      this.pushTranscript(tabId);
      this.activeTabId = tabId;
      this.emitSessions();
      void this.persist();
      this.refreshCommandsIfNeeded(tabId);
      return;
    }
    const child = findChildTab(this.sessions.values(), tabId);
    if (!child) return;
    const session = await this.ensureHydrated(child.session.id);
    if (!session) {
      this.forgetMissingSession(child.session.id);
      return;
    }
    if (!session.tabsExpanded) session.tabsExpanded = true;
    this.activeTabId = tabId;
    this.emitSessions();
    void this.persist();
  }

  async navigateToEvent(sessionId: string, turnId: string, eventId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      const reopened = await this.reopenSession(sessionId);
      if (!reopened) {
        this.forgetMissingSession(sessionId);
        return;
      }
    } else if (!(await this.ensureHydrated(sessionId))) {
      this.forgetMissingSession(sessionId);
      return;
    }
    this.activeTabId = sessionId;
    this.emitSessions();
    this.pushTranscript(sessionId);
    this.send("navigate-event", { sessionId, turnId, eventId });
    void this.persist();
    this.refreshCommandsIfNeeded(sessionId);
  }

  /** Start uncapped history search; progress arrives via find:progress / find:done. */
  startFindInSessions(query: string, searchId: number): { searchId: number } {
    const token = ++this.findGeneration;
    const needle = query.trim();
    void runFindInSessions(
      {
        isCurrent: (t) => t === this.findGeneration,
        sessionIds: () => this.sessions.keys(),
        hydratedSource: (sessionId) => {
          if (!this.hydrated.has(sessionId)) return null;
          const session = this.sessions.get(sessionId);
          if (!session) return null;
          return {
            sessionId,
            title: session.title,
            agent: session.agent,
            turns: this.transcripts.get(sessionId) ?? [],
          };
        },
        send: (channel, payload) => this.send(channel, payload),
      },
      searchId,
      token,
      needle,
    );
    return { searchId };
  }

  stopFindInSessions(): void {
    this.findGeneration += 1;
  }

  async sendPrompt(sessionId: string, text: string): Promise<void> {
    await this.promptSession(sessionId, text, true);
  }

  /** Accept a prompt and return its turn id without waiting for the turn to finish. */
  async enqueuePrompt(sessionId: string, text: string): Promise<string> {
    return this.promptSession(sessionId, text, false);
  }

  private async promptSession(
    sessionId: string,
    text: string,
    wait: boolean,
  ): Promise<string> {
    const session = await this.ensureHydrated(sessionId);
    if (!session) throw new Error("No session");
    this.bumpSession(session.id);
    this.emitSessions();
    const acp = await this.ensureSession(session);
    try {
      const turnId = await acp.prompt(text, { wait });
      if (session.agentSessionId !== acp.sessionId) {
        session.agentSessionId = acp.sessionId;
        this.emitSessions();
      }
      return turnId;
    } catch (error) {
      throw new Error(formatAgentError(error));
    } finally {
      await this.persist();
    }
  }

  async cancelPrompt(sessionId: string): Promise<void> {
    await this.agents.get(sessionId)?.cancel();
    await this.persist();
  }

  respondPermission(requestId: string, optionId: string | "cancelled"): void {
    const sessionId = this.permissionOwners.get(requestId);
    if (!sessionId) return;
    this.permissionOwners.delete(requestId);
    this.agents.get(sessionId)?.respondPermission(requestId, optionId);
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    const sessionId = this.askOwners.get(requestId);
    if (!sessionId) return;
    this.askOwners.delete(requestId);
    this.agents.get(sessionId)?.respondAskQuestion(requestId, outcome);
  }

  async getTranscript(sessionId: string): Promise<TranscriptTurn[]> {
    await this.ensureHydrated(sessionId);
    return this.transcripts.get(sessionId) ?? [];
  }

  async disposeAll(): Promise<void> {
    await this.persist();
    await this.terminals.disposeAll();
    await this.warm.dispose();
    for (const s of this.agents.values()) {
      await s.dispose();
    }
  }

  private handleTurn(sessionId: string, turn: TranscriptTurn): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const list = this.transcripts.get(sessionId) ?? [];
    const idx = list.findIndex((entry) => entry.id === turn.id);
    if (idx >= 0) list[idx] = turn;
    else list.push(turn);
    this.transcripts.set(sessionId, list);
    this.send("transcript", { sessionId, turn });
    this.bus.append({
      ...turn,
      sessionId,
      sessionTitle: session.title,
      agent: session.agent,
      navigable: true,
    });
  }

  private removeTurn(sessionId: string, turnId: string): void {
    if (!this.sessions.has(sessionId)) return;
    const list = (this.transcripts.get(sessionId) ?? []).filter((turn) => turn.id !== turnId);
    this.transcripts.set(sessionId, list);
    this.pushTranscript(sessionId);
  }

  private setStatus(
    sessionId: string,
    status: SessionStatus,
    error: string | null,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = status;
    session.error = error;
    this.send("session-status", { sessionId, status, error });
    this.emitSessions();
  }

  private queuePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, 300);
  }

  private prependSession(session: Session, pin = false): void {
    this.sessions.set(session.id, session);
    this.railLists = pin
      ? prependPinnedInLists(this.railLists, session.id)
      : prependUnpinnedInLists(this.railLists, session.id);
  }

  private bumpSession(sessionId: string): void {
    this.railLists = this.railLists.pinnedIds.includes(sessionId)
      ? prependPinnedInLists(this.railLists, sessionId)
      : prependUnpinnedInLists(this.railLists, sessionId);
  }

  private sessionListPayload() {
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

  private emitSessions(): void {
    this.send("sessions:changed", this.sessionListPayload());
    this.onSessionsChanged?.();
  }

  private openSession(session: Session): AcpSession {
    const acp = new AcpSession(session.id, session.agent, session.cwd, this.callbacksFor(session));
    const turns = this.transcripts.get(session.id);
    if (turns?.length) acp.restoreTurns(turns);
    return acp;
  }

  private ensureWarm(agent: AgentKind, cwd: string): void {
    const callbacks: SessionCallbacks = {
      ...warmCallbacks,
      onForkSupport: (supported) => this.noteForkSupport(agent, supported),
    };
    this.warm.ensure(
      agent,
      cwd,
      () => new AcpSession(newSessionId(), agent, cwd, callbacks),
    );
  }

  private noteForkSupport(agent: AgentKind, supported: boolean): void {
    if (this.forkSupport.record(agent, supported)) this.emitSessions();
  }

  private refreshCommandsIfNeeded(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.agentSessionId) return;
    void this.refreshCommands(session).catch(() => undefined);
  }

  private async refreshCommands(session: Session): Promise<void> {
    try {
      await Promise.race([
        this.ensureSession(session, { quiet: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timed out refreshing slash commands")), 45_000);
        }),
      ]);
    } catch (error) {
      const acp = this.agents.get(session.id);
      if (acp && !acp.sessionId) {
        this.agents.delete(session.id);
        await acp.dispose().catch(() => undefined);
      }
      throw error;
    }
  }

  private async ensureSession(session: Session, options?: { quiet?: boolean }): Promise<AcpSession> {
    if (!(await this.ensureHydrated(session.id))) throw new Error("No session");
    let acp = this.agents.get(session.id);
    if (!acp) {
      acp = this.openSession(session);
      this.agents.set(session.id, acp);
    }
    if (acp.sessionId) return acp;
    session.slashCommands = undefined;
    this.emitSessions();
    const priorAgentSessionId = session.agentSessionId;
    if (session.agentSessionId) await acp.attachExisting(session.agentSessionId, options);
    else await acp.start();
    session.agentSessionId = acp.sessionId;
    this.emitSessions();
    if (session.agentSessionId !== priorAgentSessionId) this.queuePersist();
    return acp;
  }

  private hydrationHost() {
    const mgr = this;
    return {
      sessions: mgr.sessions,
      transcripts: mgr.transcripts,
      hydrated: mgr.hydrated,
      bus: mgr.bus,
      get railLists() { return mgr.railLists; },
      get activeTabId() { return mgr.activeTabId; },
      setActiveTabId: (id: ActiveTabId) => { mgr.activeTabId = id; },
      setRailLists: (lists: SessionRailLists) => { mgr.railLists = lists; },
      emitSessions: () => mgr.emitSessions(),
      persist: () => { void mgr.persist(); },
      queuePersist: () => mgr.queuePersist(),
      pushTranscript: (sessionId: string) => mgr.pushTranscript(sessionId),
      send: (channel: string, payload: unknown) => mgr.send(channel, payload),
      activeParentSessionId: () => mgr.activeParentSessionId(),
      prependSession: (session: Session, pin?: boolean) => mgr.prependSession(session, pin),
    };
  }

  private ensureHydrated(sessionId: string): Promise<Session | null> {
    return ensureSessionHydrated(this.hydrationHost(), sessionId);
  }

  private forgetMissingSession(sessionId: string): void {
    forgetMissingSession(this.hydrationHost(), sessionId);
  }

  private reopenSession(sessionId: string): Promise<Session | null> {
    return reopenSession(this.hydrationHost(), sessionId);
  }

  private callbacksFor(session: Session): SessionCallbacks {
    return buildSessionCallbacks({
      session,
      send: (channel, payload) => this.send(channel, payload),
      handleTurn: (sessionId, turn) => this.handleTurn(sessionId, turn),
      removeTurn: (sessionId, turnId) => this.removeTurn(sessionId, turnId),
      setStatus: (sessionId, status, error) => this.setStatus(sessionId, status, error),
      emitSessions: () => this.emitSessions(),
      noteForkSupport: (agent, supported) => this.noteForkSupport(agent, supported),
      queuePersist: () => this.queuePersist(),
      permissionOwners: this.permissionOwners,
      askOwners: this.askOwners,
    });
  }

  /** Push the in-memory transcript so the renderer cannot show a stale empty list. */
  private pushTranscript(sessionId: string): void {
    this.send("transcript:reset", {
      sessionId,
      turns: this.transcripts.get(sessionId) ?? [],
    });
  }

  private send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}
