import type { BrowserWindow } from "electron";
import type { ActiveTabId } from "../../shared/activeTabId";
import type { AppSettings } from "../../shared/appSettings";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import type { Session } from "../../shared/session";
import type { SwitchboardTurn } from "../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../shared/transcript";
import { loadState } from "../storage/persist";
import { getAppSettings, hydrateAppSettings, patchAppSettings } from "../appSettings";
import { activeSessionMenuState } from "../menuState/activeSessionMenuState";
import type { SessionMenuState } from "../menuState/SessionMenuState";
import { openFolderInCursor } from "../cursor/openFolderInCursor";
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
import { showSessionConfigMenu } from "./showSessionConfigMenu";

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
    const sessionId = this.state.activeSessionId();
    if (sessionId) this.agents.refreshCommandsIfNeeded(sessionId);
  }

  setOnSessionsChanged(cb: (() => void) | null): void {
    this.state.onSessionsChanged = cb;
  }

  /** Session menu labels/enabled state for the active tab. */
  activeMenuState(): SessionMenuState {
    return activeSessionMenuState(this.state.menuCtx());
  }

  async openActiveInCursor(): Promise<void> {
    const sessionId = this.state.activeSessionId();
    if (!sessionId) return;
    const session = this.state.sessions.get(sessionId);
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
    this.agents.ensureWarm(getAppSettings().lastCwd);
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
      ...this.railPayload(),
      switchboardTurns: this.state.bus.list(),
    };
  }

  /** Rail sessions without the Switchboard feed (control API). */
  railPayload() {
    return this.state.sessionListPayload();
  }

  pinSession(sessionId: string): boolean {
    return this.rail.pin(sessionId);
  }

  unpinSession(sessionId: string): void {
    this.rail.unpin(sessionId);
  }

  /** `focus: false` adds the session to the rail without switching to it (control API, crons). */
  async createSession(
    input: CreateSessionInput,
    { focus = true }: { focus?: boolean } = {},
  ): Promise<Session> {
    const session = await createSession(this.deps, input, focus);
    await this.trimRail(session.id);
    return session;
  }

  async forkSession(sessionId: string, eventId?: string): Promise<Session> {
    const session = await forkSession(this.deps, sessionId, eventId);
    await this.trimRail(session.id);
    return session;
  }

  /** Keep the rail under sessionListMax after it grows. */
  private async trimRail(keepId: string): Promise<void> {
    if (await enforceSessionListMax(this.deps, keepId)) await this.persistence.persistStateFile();
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

  /** One session in the same shape `list()` reports it. */
  getSessionPayload(sessionId: string): Session | undefined {
    const session = this.state.sessions.get(sessionId);
    return session && this.state.sessionPayload(session);
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

  /** Model or effort picker; choosing a value sets it on the agent. */
  showConfigMenu(win: BrowserWindow | null, sessionId: string, category: ConfigMenuCategory): Promise<void> {
    return showSessionConfigMenu(this.deps, win, sessionId, category);
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

  /** Chats mid-turn, which a quit would interrupt. */
  runningChatCount(): number {
    return [...this.state.sessions.values()].filter((session) => session.status === "running").length;
  }

  getSubagentTranscript(sessionId: string, subagentId: string): Promise<TranscriptTurn[]> {
    return this.state.subagentTranscripts.get(sessionId, subagentId);
  }

  async disposeAll(): Promise<void> {
    await this.persist();
    await this.state.warm.dispose();
    for (const s of this.state.agents.values()) {
      await s.dispose();
    }
  }
}
