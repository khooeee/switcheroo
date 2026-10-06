import type { BrowserWindow } from "electron";
import type { ActiveTabId } from "../../shared/activeTabId";
import type { AppSettings } from "../../shared/appSettings";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import type { Session, SessionTab } from "../../shared/session";
import type { SwitchboardTurn } from "../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../shared/transcript";
import { loadState } from "../persist";
import { getAppSettings, hydrateAppSettings, patchAppSettings } from "../appSettings";
import type { SessionPinMenuState } from "../menuState/sessionPinMenuState";
import { activeForkMenuEnabled } from "../menuState/activeForkMenuEnabled";
import { activeNewTerminalMenuEnabled } from "../menuState/activeNewTerminalMenuEnabled";
import { activeOpenInCursorEnabled } from "../menuState/activeOpenInCursorEnabled";
import { activePinMenuState } from "../menuState/activePinMenuState";
import { activeRenameMenuEnabled } from "../menuState/activeRenameMenuEnabled";
import { activeStopMenuEnabled } from "../menuState/activeStopMenuEnabled";
import { activeUnreadMenuEnabled } from "../menuState/activeUnreadMenuEnabled";
import { applySessionTerminalCwd } from "../terminalTabs/applySessionTerminalCwd";
import { attachSessionTerminal } from "../terminalTabs/attachSessionTerminal";
import { closeSessionTab } from "../terminalTabs/closeSessionTab";
import { createSessionTerminalTab } from "../terminalTabs/createSessionTerminalTab";
import { moveSessionTab } from "../terminalTabs/moveSessionTab";
import { renameSessionTab } from "../terminalTabs/renameSessionTab";
import { reorderSessionTab } from "../terminalTabs/reorderSessionTab";
import { setSessionTabsExpanded } from "../terminalTabs/setSessionTabsExpanded";
import { openFolderInCursor } from "../openFolderInCursor";
import { SessionState } from "./SessionState";
import { SessionPersistence } from "./SessionPersistence";
import { SessionHydration } from "./SessionHydration";
import { SessionAgents } from "./SessionAgents";
import { SessionFind } from "./SessionFind";
import { SessionRail } from "./SessionRail";
import type { SessionDeps } from "./SessionDeps";
import { restoreSavedState } from "./restoreSavedState";
import { enforceSessionListMax } from "./enforceSessionListMax";
import { cleanSwitchboardOnStartup } from "./cleanSwitchboardOnStartup";
import { createSession } from "./createSession";
import { forkSession } from "./forkSession";
import { setActiveTab } from "./setActiveTab";
import { navigateToEvent } from "./navigateToEvent";
import { promptSession } from "./promptSession";
import { terminalTabHost } from "./terminalTabHost";

/** Main-process API for sessions, tabs, prompts and Switchboard; delegates to collaborators. */
export class SessionManager {
  private state = new SessionState();
  private persistence = new SessionPersistence(this.state);
  private hydration = new SessionHydration(this.state, this.persistence);
  private agents = new SessionAgents(this.state, this.persistence, this.hydration);
  private find = new SessionFind(this.state);
  private deps: SessionDeps = {
    state: this.state,
    persistence: this.persistence,
    hydration: this.hydration,
    agents: this.agents,
  };
  private rail = new SessionRail(this.deps);

  setWindow(win: BrowserWindow): void {
    this.state.window = win;
    this.state.terminals.setListeners(
      (tabId, data) => this.state.send("terminal:data", { tabId, data }),
      (tabId) => {
        this.state.send("terminal:exit", { tabId });
        void this.closeTab(tabId);
      },
      (tabId, cwd) => applySessionTerminalCwd(terminalTabHost(this.deps), tabId, cwd),
    );
    const parentId = this.state.activeParentSessionId();
    if (parentId) this.agents.refreshCommandsIfNeeded(parentId);
  }

  setOnSessionsChanged(cb: (() => void) | null): void {
    this.state.onSessionsChanged = cb;
  }

  /** Label/enabled for Session → Pin/Unpin based on the active chat parent. */
  activePinMenuState(): SessionPinMenuState {
    return activePinMenuState(this.state.menuCtx());
  }

  /** Rename enabled for parent or child tab. */
  activeRenameMenuEnabled(): boolean {
    return activeRenameMenuEnabled(this.state.menuCtx());
  }

  /** Unread is parent-only. */
  activeUnreadMenuEnabled(): boolean {
    return activeUnreadMenuEnabled(this.state.menuCtx());
  }

  activeForkMenuEnabled(): boolean {
    return activeForkMenuEnabled(this.state.menuCtx());
  }

  activeStopMenuEnabled(): boolean {
    return activeStopMenuEnabled(this.state.menuCtx());
  }

  activeNewTerminalMenuEnabled(): boolean {
    return activeNewTerminalMenuEnabled(this.state.menuCtx());
  }

  /** Open in Cursor uses the active chat group's project folder. */
  activeOpenInCursorEnabled(): boolean {
    return activeOpenInCursorEnabled(this.state.menuCtx());
  }

  async openActiveInCursor(): Promise<void> {
    const parentId = this.state.activeParentSessionId();
    if (!parentId) return;
    const session = this.state.sessions.get(parentId);
    if (!session?.cwd.trim()) return;
    await openFolderInCursor(session.cwd);
  }

  async init(): Promise<void> {
    const saved = await loadState();
    hydrateAppSettings(saved?.settings);
    if (saved) await restoreSavedState(this.deps, saved);
    this.state.bus.on("turn", (turn: SwitchboardTurn) => {
      this.state.send("switchboard:turn", turn);
    });
    if (await enforceSessionListMax(this.deps)) await this.persistence.persistStateFile();
    await cleanSwitchboardOnStartup(this.state);
    this.agents.ensureWarm(getAppSettings().lastAgent, getAppSettings().lastCwd);
  }

  persist(): Promise<void> {
    return this.persistence.persist();
  }

  getSettings(): AppSettings {
    return getAppSettings();
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    const next = patchAppSettings(patch);
    void this.persistence.persistStateFile();
    return next;
  }

  list() {
    return {
      ...this.state.sessionListPayload(),
      switchboardTurns: this.state.bus.list(),
    };
  }

  pinSession(sessionId: string): boolean {
    return this.rail.pin(sessionId);
  }

  unpinSession(sessionId: string): void {
    this.rail.unpin(sessionId);
  }

  /** `focus: false` adds the session to the rail without switching to it (control API). */
  createSession(
    input: CreateSessionInput,
    { focus = true }: { focus?: boolean } = {},
  ): Promise<Session> {
    return createSession(this.deps, input, focus);
  }

  forkSession(sessionId: string, eventId?: string): Promise<Session> {
    return forkSession(this.deps, sessionId, eventId);
  }

  closeSession(sessionId: string): Promise<void> {
    return this.rail.close(sessionId);
  }

  renameSession(sessionId: string, title: string): void {
    this.rail.rename(sessionId, title);
  }

  getSession(sessionId: string): Session | undefined {
    return this.state.sessions.get(sessionId);
  }

  createTerminalTab(sessionId: string): Promise<SessionTab> {
    return createSessionTerminalTab(terminalTabHost(this.deps), sessionId);
  }

  renameTab(tabId: string, title: string): void {
    renameSessionTab(terminalTabHost(this.deps), tabId, title);
  }

  closeTab(tabId: string): Promise<void> {
    return closeSessionTab(terminalTabHost(this.deps), tabId);
  }

  setTabsExpanded(sessionId: string, expanded: boolean): void {
    setSessionTabsExpanded(terminalTabHost(this.deps), sessionId, expanded);
  }

  reorderTab(sessionId: string, tabId: string, toIndex: number): void {
    reorderSessionTab(terminalTabHost(this.deps), sessionId, tabId, toIndex);
  }

  moveTab(tabId: string, toSessionId: string, toIndex: number): void {
    moveSessionTab(terminalTabHost(this.deps), tabId, toSessionId, toIndex);
  }

  attachTerminal(tabId: string): void {
    attachSessionTerminal(terminalTabHost(this.deps), tabId);
  }

  writeTerminal(tabId: string, data: string): void {
    this.state.terminals.write(tabId, data);
  }

  resizeTerminal(tabId: string, cols: number, rows: number): void {
    this.state.terminals.resize(tabId, cols, rows);
  }

  setActiveTab(tabId: ActiveTabId): Promise<void> {
    return setActiveTab(this.deps, tabId);
  }

  navigateToEvent(sessionId: string, turnId: string, eventId: string): Promise<void> {
    return navigateToEvent(this.deps, sessionId, turnId, eventId);
  }

  /** Start uncapped history search; progress arrives via find:progress / find:done. */
  startFindInSessions(query: string, searchId: number): { searchId: number } {
    return this.find.start(query, searchId);
  }

  stopFindInSessions(): void {
    this.find.stop();
  }

  async sendPrompt(sessionId: string, text: string): Promise<void> {
    await promptSession(this.deps, sessionId, text, true);
  }

  /** Accept a prompt and return its turn id without waiting for the turn to finish. */
  enqueuePrompt(sessionId: string, text: string): Promise<string> {
    return promptSession(this.deps, sessionId, text, false);
  }

  async cancelPrompt(sessionId: string): Promise<void> {
    await this.state.agents.get(sessionId)?.cancel();
    await this.persist();
  }

  respondPermission(requestId: string, optionId: string | "cancelled"): void {
    const { state } = this;
    const sessionId = state.permissionOwners.get(requestId);
    if (!sessionId) return;
    state.permissionOwners.delete(requestId);
    state.agents.get(sessionId)?.respondPermission(requestId, optionId);
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    const { state } = this;
    const sessionId = state.askOwners.get(requestId);
    if (!sessionId) return;
    state.askOwners.delete(requestId);
    state.agents.get(sessionId)?.respondAskQuestion(requestId, outcome);
  }

  async getTranscript(sessionId: string): Promise<TranscriptTurn[]> {
    await this.hydration.ensure(sessionId);
    return this.state.transcripts.get(sessionId) ?? [];
  }

  /** Work a quit would interrupt: chats mid-turn and live terminal shells. */
  quitBusyCounts(): { runningChats: number; openTerminals: number } {
    const sessions = [...this.state.sessions.values()];
    return {
      runningChats: sessions.filter((session) => session.status === "running").length,
      openTerminals: this.state.terminals.count(),
    };
  }

  async disposeAll(): Promise<void> {
    await this.persist();
    await this.state.terminals.disposeAll();
    await this.state.warm.dispose();
    for (const s of this.state.agents.values()) {
      await s.dispose();
    }
  }
}
