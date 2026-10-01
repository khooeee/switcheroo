import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import type {
  ActiveSessionId,
  AgentKind,
  AppSettings,
  CreateSessionInput,
  SwitchboardEvent,
  PersistedState,
  Session,
  SessionStatus,
  TranscriptItem,
  FindInSessionsHit,
} from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { GlobalEventBus } from "./events";
import { AcpSession } from "./acp/session";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { agentLabel } from "./acp/presets";
import { loadState, saveState } from "./persist";
import { getAppSettings, hydrateAppSettings, patchAppSettings } from "./appSettings";
import { loadSessionMeta, saveSessionMeta, type SessionMeta } from "./sessionMeta";
import { loadTranscript, saveTranscript } from "./sessionTranscripts";
import { loadSwitchboardEvents, saveSwitchboardEvents } from "./switchboardEvents";
import { switchboardCleanupCutoff } from "./switchboardCleanup";
import { overflowSessionIds } from "./overflowSessionIds";
import {
  loadListsFromPersisted,
  pinSessionInLists,
  prependPinnedInLists,
  prependUnpinnedInLists,
  removeSessionFromLists,
  reorderPinnedInLists,
  unpinSessionInLists,
  type SessionRailLists,
} from "./sessionRailLists";
import { findInSessionSources } from "./findInSessionSources";
import { listSessionIdsOnDisk } from "./listSessionIdsOnDisk";
import { formatAgentError } from "../shared/formatAgentError";
import { forkSessionAtEvent } from "./forkSessionAtEvent";
import { controlBootstrapText } from "./acp/controlBootstrapPrompt";
import { newSessionId } from "./newSessionId";
import { SessionWaiters } from "./sessionWaiters";
import { WarmSessionPool } from "./acp/WarmSessionPool";
import { sessionPinMenuState, type SessionPinMenuState } from "./sessionPinMenuState";

const warmCallbacks: SessionCallbacks = {
  onPromptComplete: () => undefined,
  onSteeringSupport: () => undefined,
  onAvailableCommands: () => undefined,
  onUsage: () => undefined,
  onTranscript: () => undefined,
  onTranscriptPatch: () => undefined,
  onStatus: () => undefined,
  onPermission: () => undefined,
  onAskQuestion: () => undefined,
  getSessionTitle: () => "Warm",
};

export class SessionManager {
  private sessions = new Map<string, Session>();
  private railLists: SessionRailLists = { pinnedIds: [], unpinnedIds: [] };
  private agents = new Map<string, AcpSession>();
  private transcripts = new Map<string, TranscriptItem[]>();
  private hydrated = new Set<string>();
  private activeSessionId: ActiveSessionId = SWITCHBOARD_ID;
  private bus = new GlobalEventBus();
  private window: BrowserWindow | null = null;
  private permissionOwners = new Map<string, string>(); // requestId -> sessionId
  private askOwners = new Map<string, string>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private waiters = new SessionWaiters();
  private findGeneration = 0;
  private warm = new WarmSessionPool<AcpSession>();
  private onSessionsChanged: (() => void) | null = null;

  setWindow(win: BrowserWindow): void {
    this.window = win;
    if (this.activeSessionId !== SWITCHBOARD_ID) this.refreshCommandsIfNeeded(this.activeSessionId);
  }

  setOnSessionsChanged(cb: (() => void) | null): void {
    this.onSessionsChanged = cb;
  }

  /** Label/enabled for Session → Pin/Unpin based on the active session. */
  activePinMenuState(): SessionPinMenuState {
    return sessionPinMenuState(
      this.activeSessionId,
      this.railLists.pinnedIds,
      this.sessions.has(this.activeSessionId),
    );
  }

  activeRenameMenuEnabled(): boolean {
    return (
      this.activeSessionId !== SWITCHBOARD_ID && this.sessions.has(this.activeSessionId)
    );
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
          this.sessions.set(id, {
            id,
            title: meta?.title || id,
            agent: meta?.agent ?? "claude",
            cwd: meta?.cwd ?? "",
            agentSessionId: meta?.agentSessionId ?? null,
            status: "idle",
            error: null,
            createdAt: Date.now(),
            usage: meta?.usage,
          });
        }),
      );
      this.activeSessionId =
        saved.activeSessionId === SWITCHBOARD_ID || openIds.includes(saved.activeSessionId)
          ? saved.activeSessionId
          : SWITCHBOARD_ID;
      const openSessionIds = new Set(openIds);
      const switchboardEvents = await loadSwitchboardEvents();
      const navigableIds = new Set(openSessionIds);
      const titles = new Map<string, string>(
        [...this.sessions.entries()].map(([id, session]) => [id, session.title]),
      );
      const closedIds = [
        ...new Set(switchboardEvents.map((e) => e.sessionId)),
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
        switchboardEvents.map((e) => ({
          ...e,
          sessionTitle: titles.get(e.sessionId) ?? e.sessionTitle,
          navigable: navigableIds.has(e.sessionId),
        })),
      );
      if (this.activeSessionId !== SWITCHBOARD_ID) await this.ensureHydrated(this.activeSessionId);
    }

    this.bus.on("event", (event: SwitchboardEvent) => {
      this.send("switchboard:event", event);
    });
    if (await this.enforceSessionListMax()) await this.persistStateFile();
    await this.maybeCleanSwitchboard();
    this.ensureWarm(getAppSettings().lastAgent, getAppSettings().lastCwd);
  }

  async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.persistStateFile();
    await saveSwitchboardEvents(this.bus.list());
    await Promise.all(
      [...this.sessions.values()].map(async (session) => {
        await saveSessionMeta(session.id, metaFromSession(session));
        if (!this.hydrated.has(session.id)) return;
        await saveTranscript(session.id, this.transcripts.get(session.id) ?? []);
      }),
    );
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
      activeSessionId: this.activeSessionId,
      settings: getAppSettings(),
      pinned: [...this.railLists.pinnedIds],
      unpinned: [...this.railLists.unpinnedIds],
    };
    await saveState(state);
  }

  /** Age-out old Switchboard events on startup. */
  private async maybeCleanSwitchboard(): Promise<void> {
    const cutoff = switchboardCleanupCutoff(getAppSettings().cleanSwitchboardEventsOlderThanDays);
    if (cutoff == null) return;
    const removed = this.bus.removeOlderThan(cutoff);
    if (removed === 0) return;
    this.send("switchboard:events", this.bus.list());
    await saveSwitchboardEvents(this.bus.list());
  }

  /** Soft-close oldest rail sessions on startup when over sessionListMax. */
  private async enforceSessionListMax(): Promise<boolean> {
    const protect =
      this.activeSessionId !== SWITCHBOARD_ID ? this.activeSessionId : undefined;
    const max = getAppSettings().sessionListMax;
    const unpinnedCap = Math.max(0, max - this.railLists.pinnedIds.length);
    const toClose = overflowSessionIds(
      this.railLists.unpinnedIds,
      unpinnedCap,
      protect,
    );
    if (toClose.length === 0) return false;
    for (const id of toClose) await this.softCloseSession(id);
    this.emitSessions();
    return true;
  }

  /** Close a session from the rail without deleting its folder. */
  private async softCloseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    for (const event of this.bus.setSessionTitle(sessionId, session.title)) {
      this.send("switchboard:event", event);
    }
    if (this.hydrated.has(sessionId)) {
      await saveSessionMeta(sessionId, metaFromSession(session));
      await saveTranscript(sessionId, this.transcripts.get(sessionId) ?? []);
    }
    const acp = this.agents.get(sessionId);
    if (acp) {
      await acp.dispose();
      this.agents.delete(sessionId);
    }
    this.sessions.delete(sessionId);
    this.transcripts.delete(sessionId);
    this.hydrated.delete(sessionId);
    this.railLists = removeSessionFromLists(this.railLists, sessionId);
    if (this.activeSessionId === sessionId) this.activeSessionId = SWITCHBOARD_ID;
  }

  list() {
    return {
      ...this.sessionListPayload(),
      switchboardEvents: this.bus.list(),
    };
  }

  pinSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) return;
    this.railLists = pinSessionInLists(this.railLists, sessionId);
    this.emitSessions();
    void this.persist();
  }

  unpinSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) return;
    this.railLists = unpinSessionInLists(this.railLists, sessionId);
    this.emitSessions();
    void this.persist();
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
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
    };
    this.prependSession(session, input.pin === true);
    this.transcripts.set(id, []);
    this.hydrated.add(id);
    this.activeSessionId = id;
    this.emitSessions();

    try {
      const claimed = await this.warm.claim(input.agent, input.cwd);
      if (claimed) {
        claimed.adopt(id, this.callbacksFor(session));
        this.agents.set(id, claimed);
        session.agentSessionId = claimed.sessionId;
        this.setStatus(id, "ready", null);
        this.bus.append({
          id: randomUUID(),
          sessionId: id,
          sessionTitle: session.title,
          agent: session.agent,
          at: Date.now(),
          kind: "status",
          summary: `${agentLabel(session.agent)} session ready`,
          navigable: true,
        });
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

  waitUntilSettled(
    sessionId: string,
    timeoutMs: number,
  ): Promise<{ sessionId: string; status: string; error: string | null }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("No session");
    const pending = this.waiters.waitSettled(sessionId, timeoutMs, {
      status: session.status,
      error: session.error,
    });
    const again = this.sessions.get(sessionId);
    if (again) this.waiters.notifySettled(sessionId, again.status, again.error);
    return pending;
  }

  async forkSession(sessionId: string, eventId?: string): Promise<Session> {
    if (!(await this.ensureHydrated(sessionId))) throw new Error("Session not found");
    return forkSessionAtEvent({
      getSession: (id) => this.sessions.get(id),
      getTranscript: (id) => this.transcripts.get(id) ?? [],
      listTitles: () => [...this.sessions.values()].map((session) => session.title),
      ensureSession: async (session) => this.ensureSession(session),
      callbacksFor: (session) => this.callbacksFor(session),
      bus: () => this.bus,
      setSession: (id, session) => { this.agents.set(id, session); },
      addSession: (session, transcript) => {
        const pin = this.railLists.pinnedIds.includes(sessionId);
        this.prependSession(session, pin);
        this.transcripts.set(session.id, transcript);
        this.hydrated.add(session.id);
      },
      setActiveSession: (id) => { this.activeSessionId = id; },
      emitSessions: () => this.emitSessions(),
      send: (channel, payload) => this.send(channel, payload),
      persist: () => this.persist(),
    }, sessionId, eventId);
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) return;
    await this.softCloseSession(sessionId);
    this.emitSessions();
    void this.persist();
  }

  renameSession(sessionId: string, title: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.title = title;
    for (const event of this.bus.setSessionTitle(sessionId, title)) {
      this.send("switchboard:event", event);
    }
    this.emitSessions();
    void this.persist();
  }

  reorderPinnedSessions(sessionIds: string[]): void {
    this.railLists = reorderPinnedInLists(
      this.railLists,
      sessionIds,
      new Set(this.sessions.keys()),
    );
    this.emitSessions();
    void this.persist();
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  async setActiveSession(sessionId: ActiveSessionId): Promise<void> {
    if (sessionId !== SWITCHBOARD_ID && !this.sessions.has(sessionId)) return;
    if (sessionId !== SWITCHBOARD_ID) {
      const session = await this.ensureHydrated(sessionId);
      if (!session) {
        this.forgetMissingSession(sessionId);
        return;
      }
      this.pushTranscript(sessionId);
    }
    this.activeSessionId = sessionId;
    this.emitSessions();
    void this.persist();
    if (sessionId !== SWITCHBOARD_ID) this.refreshCommandsIfNeeded(sessionId);
  }

  async navigateToEvent(sessionId: string, eventId: string): Promise<void> {
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
    this.activeSessionId = sessionId;
    this.emitSessions();
    this.pushTranscript(sessionId);
    this.send("navigate-event", { sessionId, eventId });
    void this.persist();
    this.refreshCommandsIfNeeded(sessionId);
  }

  /** Start uncapped history search; progress arrives via find:progress / find:done. */
  startFindInSessions(query: string, searchId: number): { searchId: number } {
    const token = ++this.findGeneration;
    const needle = query.trim();
    void this.runFindInSessions(searchId, token, needle);
    return { searchId };
  }

  stopFindInSessions(): void {
    this.findGeneration += 1;
  }

  private async runFindInSessions(
    searchId: number,
    token: number,
    needle: string,
  ): Promise<void> {
    if (token !== this.findGeneration) {
      this.send("find:done", { searchId, stopped: true });
      return;
    }
    if (!needle) {
      this.send("find:done", { searchId, stopped: false });
      return;
    }
    const ids = new Set(await listSessionIdsOnDisk());
    if (token !== this.findGeneration) {
      this.send("find:done", { searchId, stopped: true });
      return;
    }
    for (const id of this.sessions.keys()) ids.add(id);
    const ordered = [...ids].sort().reverse();
    const total = ordered.length;
    let scanned = 0;
    let matchCount = 0;
    const hits: FindInSessionsHit[] = [];
    let lastSentAt = 0;
    const flushProgress = (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastSentAt < 300) return;
      this.send("find:progress", {
        searchId,
        scanned,
        total,
        matchCount,
      });
      lastSentAt = now;
    };
    flushProgress(true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    for (const sessionId of ordered) {
      if (token !== this.findGeneration) {
        flushProgress(true);
        await this.deliverFindHits(searchId, hits);
        this.send("find:done", { searchId, stopped: true });
        return;
      }
      let source = null;
      if (this.hydrated.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        if (session) {
          source = {
            sessionId,
            title: session.title,
            agent: session.agent,
            items: this.transcripts.get(sessionId) ?? [],
          };
        }
      } else {
        const meta = await loadSessionMeta(sessionId);
        if (meta) {
          source = {
            sessionId,
            title: meta.title,
            agent: meta.agent,
            items: await loadTranscript(sessionId),
          };
        }
      }
      if (source) {
        const found = findInSessionSources([source], needle);
        if (found.length) {
          hits.push(...found);
          matchCount += found.length;
        }
      }
      scanned += 1;
      const before = lastSentAt;
      flushProgress(false);
      if (lastSentAt !== before) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    const stopped = token !== this.findGeneration;
    flushProgress(true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    await this.deliverFindHits(searchId, hits);
    this.send("find:done", { searchId, stopped });
  }

  /** Send hits in small IPC chunks so a large result set cannot stall the UI. */
  private async deliverFindHits(searchId: number, hits: FindInSessionsHit[]): Promise<void> {
    hits.sort((a, b) => b.at - a.at);
    const chunkSize = 100;
    for (let i = 0; i < hits.length; i += chunkSize) {
      this.send("find:chunk", { searchId, added: hits.slice(i, i + chunkSize) });
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  async sendPrompt(sessionId: string, text: string): Promise<void> {
    const session = await this.ensureHydrated(sessionId);
    if (!session) throw new Error("No session");
    this.bumpSession(session.id);
    this.emitSessions();
    const acp = await this.ensureSession(session);
    try {
      await acp.prompt(text);
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

  async getTranscript(sessionId: string): Promise<TranscriptItem[]> {
    await this.ensureHydrated(sessionId);
    return this.transcripts.get(sessionId) ?? [];
  }

  async disposeAll(): Promise<void> {
    await this.persist();
    await this.warm.dispose();
    for (const s of this.agents.values()) {
      await s.dispose();
    }
  }

  private handleTranscript(
    sessionId: string,
    item: TranscriptItem,
    replaceId?: string,
  ): void {
    if (!this.sessions.has(sessionId)) return;
    const list = this.transcripts.get(sessionId) ?? [];
    if (replaceId) {
      const idx = list.findIndex((i) => i.id === replaceId);
      if (idx >= 0) {
        list[idx] = item.role === "tool" ? item : {
          ...list[idx],
          text: list[idx].text + item.text,
          at: item.at,
        };
        this.transcripts.set(sessionId, list);
        this.send("transcript", { sessionId, item: list[idx], replaceId });
        return;
      }
    }
    list.push(item);
    this.transcripts.set(sessionId, list);
    this.send("transcript", { sessionId, item });
  }

  private patchTranscript(
    sessionId: string,
    id: string,
    patch: Pick<TranscriptItem, "queued">,
  ): void {
    if (!this.sessions.has(sessionId)) return;
    const list = this.transcripts.get(sessionId) ?? [];
    const idx = list.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const next = { ...list[idx], ...patch };
    if (!patch.queued) delete next.queued;
    list[idx] = next;
    this.transcripts.set(sessionId, list);
    this.send("transcript", { sessionId, item: next, replaceId: id });
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
    this.waiters.notifySettled(sessionId, status, error);
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
      ids.map((id) => this.sessions.get(id)).filter((session): session is Session => !!session);
    return {
      pinned: map(this.railLists.pinnedIds),
      unpinned: map(this.railLists.unpinnedIds),
      activeSessionId: this.activeSessionId,
    };
  }

  private emitSessions(): void {
    this.send("sessions:changed", this.sessionListPayload());
    this.onSessionsChanged?.();
  }

  private openSession(session: Session): AcpSession {
    return new AcpSession(session.id, session.agent, session.cwd, this.bus, this.callbacksFor(session));
  }

  private ensureWarm(agent: AgentKind, cwd: string): void {
    this.warm.ensure(
      agent,
      cwd,
      () => new AcpSession(newSessionId(), agent, cwd, this.bus, warmCallbacks),
    );
  }

  private refreshCommandsIfNeeded(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.agentSessionId) return;
    void this.refreshCommands(session).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      // Missing cwd is expected for stale sessions; logging it can EPIPE in Electron.
      if (/^Working directory /.test(message)) return;
      console.error("[sessions] failed to refresh slash commands", error);
    });
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

  private async ensureHydrated(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (this.hydrated.has(sessionId)) return session;
    const meta = await loadSessionMeta(sessionId);
    if (!meta) {
      this.sessions.delete(sessionId);
      this.transcripts.delete(sessionId);
      this.railLists = removeSessionFromLists(this.railLists, sessionId);
      if (this.activeSessionId === sessionId) this.activeSessionId = SWITCHBOARD_ID;
      this.emitSessions();
      void this.persist();
      return null;
    }
    session.title = meta.title;
    session.agent = meta.agent;
    session.cwd = meta.cwd;
    session.agentSessionId = meta.agentSessionId;
    session.usage = meta.usage;
    const items = await loadTranscript(sessionId);
    this.transcripts.set(sessionId, items);
    this.hydrated.add(sessionId);
    this.pushTranscript(sessionId);
    this.emitSessions();
    return session;
  }

  private callbacksFor(session: Session): SessionCallbacks {
    return {
      onPromptComplete: () => {
        this.send("prompt:complete", { sessionId: session.id });
      },
      onTranscript: (item, replaceId) => this.handleTranscript(session.id, item, replaceId),
      onTranscriptPatch: (id, patch) => this.patchTranscript(session.id, id, patch),
      onStatus: (status, error) => this.setStatus(session.id, status, error ?? null),
      onSteeringSupport: (supported) => {
        session.supportsSteering = supported;
        this.emitSessions();
      },
      onUsage: (usage) => {
        session.usage = usage;
        this.emitSessions();
        this.queuePersist();
      },
      onAvailableCommands: (commands) => {
        session.slashCommands = commands;
        this.emitSessions();
      },
      onPermission: (req) => {
        this.permissionOwners.set(req.requestId, session.id);
        this.send("permission", req);
      },
      onQuestionSettled: (requestId) => {
        this.askOwners.delete(requestId);
        this.send("question:settled", { requestId });
      },
      onAskQuestion: (req) => {
        this.askOwners.set(req.requestId, session.id);
        this.send("ask-question", req);
      },
      getSessionTitle: () => session.title,
    };
  }

  /** Session folder missing: drop open entry + Switchboard events and tell the UI. */
  private forgetMissingSession(sessionId: string): void {
    const title =
      this.sessions.get(sessionId)?.title ??
      this.bus.list().find((event) => event.sessionId === sessionId)?.sessionTitle ??
      "Session";
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.transcripts.delete(sessionId);
      this.hydrated.delete(sessionId);
      this.railLists = removeSessionFromLists(this.railLists, sessionId);
      if (this.activeSessionId === sessionId) this.activeSessionId = SWITCHBOARD_ID;
      this.emitSessions();
    }
    this.bus.removeSession(sessionId);
    this.send("switchboard:session-removed", {
      sessionId,
      message: `Session “${title}” is no longer on disk and was removed from Switchboard.`,
    });
    void this.persist();
  }

  private async reopenSession(sessionId: string): Promise<Session | null> {
    const meta = await loadSessionMeta(sessionId);
    if (!meta) return null;
    const items = await loadTranscript(sessionId);
    const session: Session = {
      id: sessionId,
      title: meta.title,
      agent: meta.agent,
      cwd: meta.cwd,
      agentSessionId: meta.agentSessionId,
      status: "idle",
      error: null,
      createdAt: Date.now(),
      usage: meta.usage,
    };
    this.prependSession(session);
    this.transcripts.set(sessionId, items);
    this.hydrated.add(sessionId);
    this.pushTranscript(sessionId);
    return session;
  }

  /** Push the in-memory transcript so the renderer cannot show a stale empty list. */
  private pushTranscript(sessionId: string): void {
    this.send("transcript:reset", {
      sessionId,
      items: this.transcripts.get(sessionId) ?? [],
    });
  }

  private send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}

function metaFromSession(session: Session): SessionMeta {
  return {
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    agentSessionId: session.agentSessionId,
    usage: session.usage,
  };
}
