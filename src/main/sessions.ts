import * as path from "node:path";
import type { BrowserWindow } from "electron";
import type {
  ActiveSessionId,
  CreateSessionInput,
  MasterEvent,
  PersistedState,
  Session,
  SessionStatus,
  TranscriptItem,
} from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { GlobalEventBus } from "./events";
import { AcpSession } from "./acp/session";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { agentLabel } from "./acp/presets";
import { loadState, saveState } from "./persist";
import { loadSessionMeta, saveSessionMeta, type SessionMeta } from "./sessionMeta";
import { loadSessionNotes, saveSessionNotes } from "./sessionNotes";
import { loadTranscript, saveTranscript } from "./sessionTranscripts";
import { loadSwitchboardEvents, saveSwitchboardEvents } from "./switchboardEvents";
import { formatAgentError } from "../shared/formatAgentError";
import { forkSessionAtEvent } from "./forkSessionAtEvent";
import { controlBootstrapText } from "./acp/controlBootstrapPrompt";
import { newSessionId } from "./newSessionId";
import { SessionWaiters } from "./sessionWaiters";

export class SessionManager {
  private sessions = new Map<string, Session>();
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

  setWindow(win: BrowserWindow): void {
    this.window = win;
    if (this.activeSessionId !== SWITCHBOARD_ID) this.refreshCommandsIfNeeded(this.activeSessionId);
  }

  async init(): Promise<void> {
    const saved = await loadState();
    if (saved) {
      const openIds: string[] = [];
      const legacy = saved as PersistedState & {
        tabs?: Array<string | { id: string; title: string }>;
        activeTabId?: ActiveSessionId;
      };
      const savedSessions = legacy.sessions ?? legacy.tabs ?? [];
      const savedActive = legacy.activeSessionId ?? legacy.activeTabId ?? SWITCHBOARD_ID;
      for (const raw of savedSessions) {
        const id = typeof raw === "string" ? raw : raw.id;
        const title = typeof raw === "string" ? raw : raw.title;
        if (!id) continue;
        openIds.push(id);
        this.sessions.set(id, {
          id,
          title: title || id,
          agentKind: "claude",
          cwd: "",
          agentSessionId: null,
          status: "idle",
          error: null,
          createdAt: Date.now(),
        });
        this.transcripts.set(id, []);
      }
      this.activeSessionId =
        savedActive === SWITCHBOARD_ID || openIds.includes(savedActive)
          ? savedActive
          : SWITCHBOARD_ID;
      const openSessionIds = new Set(openIds);
      const masterEvents = await loadSwitchboardEvents();
      const navigableIds = new Set(openSessionIds);
      const titles = new Map<string, string>(
        [...this.sessions.entries()].map(([id, tab]) => [id, tab.title]),
      );
      const closedIds = [
        ...new Set(
          masterEvents.map((e) => {
            const legacy = e as MasterEvent & { tabId?: string };
            return legacy.sessionId || legacy.tabId || "";
          }),
        ),
      ].filter((id) => id && !openSessionIds.has(id));
      for (const sessionId of closedIds) {
        const meta = await loadSessionMeta(sessionId);
        if (!meta) continue;
        navigableIds.add(sessionId);
        titles.set(sessionId, meta.title);
      }
      this.bus.restore(
        masterEvents.map((e) => {
          const legacy = e as MasterEvent & { tabId?: string; tabTitle?: string };
          const sessionId = legacy.sessionId || legacy.tabId || "";
          return {
            id: e.id,
            sessionId,
            sessionTitle: titles.get(sessionId) ?? legacy.sessionTitle ?? legacy.tabTitle,
            agentKind: e.agentKind,
            at: e.at,
            kind: e.kind,
            summary: e.summary,
            fileChanges: e.fileChanges,
            toolStatus: e.toolStatus,
            navigable: navigableIds.has(sessionId),
          };
        }),
      );
      if (this.activeSessionId !== SWITCHBOARD_ID) await this.ensureHydrated(this.activeSessionId);
    }

    this.bus.on("event", (event: MasterEvent) => {
      this.send("master:event", event);
    });
  }

  async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    const state: PersistedState = {
      version: 1,
      activeSessionId: this.activeSessionId,
      sessions: [...this.sessions.values()].map((t) => ({ id: t.id, title: t.title })),
    };
    await saveState(state);
    await saveSwitchboardEvents(this.bus.list());
    await Promise.all(
      [...this.sessions.values()].map(async (tab) => {
        if (!this.hydrated.has(tab.id)) return;
        await saveSessionMeta(tab.id, metaFromSession(tab));
        await saveSessionNotes(tab.id, tab.notes ?? "");
        await saveTranscript(tab.id, this.transcripts.get(tab.id) ?? []);
      }),
    );
  }

  list() {
    return {
      sessions: [...this.sessions.values()],
      activeSessionId: this.activeSessionId,
      masterEvents: this.bus.list(),
    };
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
    const id = newSessionId();
    const title =
      input.title ??
      `${agentLabel(input.agentKind)} · ${path.basename(input.cwd)}`;
    const tab: Session = {
      id,
      title,
      agentKind: input.agentKind,
      cwd: input.cwd,
      agentSessionId: null,
      status: "connecting",
      error: null,
      createdAt: Date.now(),
    };
    this.prependSession(tab);
    this.transcripts.set(id, []);
    this.hydrated.add(id);
    this.activeSessionId = id;
    this.emitSessions();

    const session = this.openSession(tab);
    this.agents.set(id, session);

    try {
      await session.start();
      tab.agentSessionId = session.sessionId;
      this.emitSessions();
      if (input.switcherooAware) {
        await session.prompt(controlBootstrapText());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus(id, "error", msg);
    }

    void this.persist();
    return tab;
  }

  waitUntilSettled(
    sessionId: string,
    timeoutMs: number,
  ): Promise<{ sessionId: string; status: string; error: string | null }> {
    const tab = this.sessions.get(sessionId);
    if (!tab) throw new Error("No session");
    const pending = this.waiters.waitSettled(sessionId, timeoutMs, {
      status: tab.status,
      error: tab.error,
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
      listTitles: () => [...this.sessions.values()].map((tab) => tab.title),
      ensureSession: async (tab) => this.ensureSession(tab),
      callbacksFor: (tab) => this.callbacksFor(tab),
      bus: () => this.bus,
      setSession: (id, session) => { this.agents.set(id, session); },
      addSession: (tab, transcript) => {
        this.prependSession(tab);
        this.transcripts.set(tab.id, transcript);
        this.hydrated.add(tab.id);
      },
      setActiveSession: (id) => { this.activeSessionId = id; },
      emitSessions: () => this.emitSessions(),
      send: (channel, payload) => this.send(channel, payload),
      persist: () => this.persist(),
    }, sessionId, eventId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const tab = this.sessions.get(sessionId);
    if (!tab) return;
    for (const event of this.bus.setSessionTitle(sessionId, tab.title)) {
      this.send("master:event", event);
    }
    if (this.hydrated.has(sessionId)) {
      await saveSessionMeta(sessionId, metaFromSession(tab));
      await saveSessionNotes(sessionId, tab.notes ?? "");
      await saveTranscript(sessionId, this.transcripts.get(sessionId) ?? []);
    }
    const session = this.agents.get(sessionId);
    if (session) {
      await session.dispose();
      this.agents.delete(sessionId);
    }
    this.sessions.delete(sessionId);
    this.transcripts.delete(sessionId);
    this.hydrated.delete(sessionId);
    if (this.activeSessionId === sessionId) this.activeSessionId = SWITCHBOARD_ID;
    this.emitSessions();
    void this.persist();
  }

  renameSession(sessionId: string, title: string): void {
    const tab = this.sessions.get(sessionId);
    if (!tab) return;
    tab.title = title;
    for (const event of this.bus.setSessionTitle(sessionId, title)) {
      this.send("master:event", event);
    }
    this.emitSessions();
    void this.persist();
  }

  setSessionNotes(sessionId: string, notes: string): void {
    void this.ensureHydrated(sessionId).then((tab) => {
      if (!tab) return;
      tab.notes = notes;
      this.queuePersist();
    });
  }

  setSessionNotesWidth(sessionId: string, width: number): void {
    void this.ensureHydrated(sessionId).then((tab) => {
      if (!tab) return;
      tab.notesWidth = Number.isFinite(width) ? Math.round(width) : tab.notesWidth;
      this.queuePersist();
    });
  }

  reorderSessions(sessionIds: string[]): void {
    const requested = sessionIds.filter((id) => this.sessions.has(id));
    const next = new Map<string, Session>();
    for (const id of requested) {
      const tab = this.sessions.get(id);
      if (tab) next.set(id, tab);
    }
    for (const [id, tab] of this.sessions) {
      if (!next.has(id)) next.set(id, tab);
    }
    this.sessions = next;
    this.emitSessions();
    void this.persist();
  }

  async setActiveSession(sessionId: ActiveSessionId): Promise<void> {
    if (sessionId !== SWITCHBOARD_ID && !this.sessions.has(sessionId)) return;
    if (sessionId !== SWITCHBOARD_ID) {
      const tab = await this.ensureHydrated(sessionId);
      if (!tab) return;
    }
    this.activeSessionId = sessionId;
    this.emitSessions();
    void this.persist();
    if (sessionId !== SWITCHBOARD_ID) this.refreshCommandsIfNeeded(sessionId);
  }

  async navigateToEvent(sessionId: string, eventId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      const reopened = await this.reopenSession(sessionId);
      if (!reopened) return;
    } else if (!(await this.ensureHydrated(sessionId))) {
      return;
    }
    this.activeSessionId = sessionId;
    this.emitSessions();
    this.send("navigate-event", { sessionId, eventId });
    void this.persist();
    this.refreshCommandsIfNeeded(sessionId);
  }

  async sendPrompt(sessionId: string, text: string): Promise<void> {
    const tab = await this.ensureHydrated(sessionId);
    if (!tab) throw new Error("No session");
    this.prependSession(tab);
    this.emitSessions();
    const session = await this.ensureSession(tab);
    try {
      await session.prompt(text);
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

  private setStatus(
    sessionId: string,
    status: SessionStatus,
    error: string | null,
  ): void {
    const tab = this.sessions.get(sessionId);
    if (!tab) return;
    tab.status = status;
    tab.error = error;
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

  private prependSession(tab: Session): void {
    const next = new Map<string, Session>();
    next.set(tab.id, tab);
    for (const [id, existing] of this.sessions) {
      if (id !== tab.id) next.set(id, existing);
    }
    this.sessions = next;
  }

  private emitSessions(): void {
    this.send("sessions:changed", {
      sessions: [...this.sessions.values()],
      activeSessionId: this.activeSessionId,
    });
  }

  private openSession(tab: Session): AcpSession {
    return new AcpSession(tab.id, tab.agentKind, tab.cwd, this.bus, this.callbacksFor(tab));
  }

  private refreshCommandsIfNeeded(sessionId: string): void {
    const tab = this.sessions.get(sessionId);
    if (!tab || !tab.agentSessionId) return;
    void this.refreshCommands(tab).catch((error) => {
      console.error("[sessions] failed to refresh slash commands", error);
    });
  }

  private async refreshCommands(tab: Session): Promise<void> {
    try {
      await Promise.race([
        this.ensureSession(tab, { quiet: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timed out refreshing slash commands")), 45_000);
        }),
      ]);
    } catch (error) {
      const session = this.agents.get(tab.id);
      if (session && !session.sessionId) {
        this.agents.delete(tab.id);
        await session.dispose().catch(() => undefined);
      }
      throw error;
    }
  }

  private async ensureSession(tab: Session, options?: { quiet?: boolean }): Promise<AcpSession> {
    if (!(await this.ensureHydrated(tab.id))) throw new Error("No session");
    let session = this.agents.get(tab.id);
    if (!session) {
      session = this.openSession(tab);
      this.agents.set(tab.id, session);
    }
    if (session.sessionId) return session;
    tab.slashCommands = undefined;
    this.emitSessions();
    if (tab.agentSessionId) await session.attachExisting(tab.agentSessionId, options);
    else await session.start();
    tab.agentSessionId = session.sessionId;
    this.emitSessions();
    return session;
  }

  private async ensureHydrated(sessionId: string): Promise<Session | null> {
    const tab = this.sessions.get(sessionId);
    if (!tab) return null;
    if (this.hydrated.has(sessionId)) return tab;
    const meta = await loadSessionMeta(sessionId);
    if (!meta) {
      this.sessions.delete(sessionId);
      this.transcripts.delete(sessionId);
      if (this.activeSessionId === sessionId) this.activeSessionId = SWITCHBOARD_ID;
      this.emitSessions();
      void this.persist();
      return null;
    }
    tab.title = meta.title;
    tab.agentKind = meta.agentKind;
    tab.cwd = meta.cwd;
    tab.agentSessionId = meta.agentSessionId;
    tab.notesWidth = meta.notesWidth;
    tab.notes = await loadSessionNotes(sessionId);
    const items = await loadTranscript(sessionId);
    this.transcripts.set(sessionId, items);
    this.hydrated.add(sessionId);
    this.send("transcript:reset", { sessionId, items });
    this.emitSessions();
    return tab;
  }

  private callbacksFor(tab: Session): SessionCallbacks {
    return {
      onPromptComplete: () => {
        this.send("prompt:complete", { sessionId: tab.id });
      },
      onTranscript: (item, replaceId) => this.handleTranscript(tab.id, item, replaceId),
      onStatus: (status, error) => this.setStatus(tab.id, status, error ?? null),
      onSteeringSupport: (supported) => {
        tab.supportsSteering = supported;
        this.emitSessions();
      },
      onUsage: (usage) => {
        tab.usage = usage;
        this.emitSessions();
      },
      onAvailableCommands: (commands) => {
        tab.slashCommands = commands;
        this.emitSessions();
      },
      onPermission: (req) => {
        this.permissionOwners.set(req.requestId, tab.id);
        this.send("permission", req);
      },
      onQuestionSettled: (requestId) => {
        this.askOwners.delete(requestId);
        this.send("question:settled", { requestId });
      },
      onAskQuestion: (req) => {
        this.askOwners.set(req.requestId, tab.id);
        this.send("ask-question", req);
      },
      getSessionTitle: () => tab.title,
    };
  }

  private async reopenSession(sessionId: string): Promise<Session | null> {
    const meta = await loadSessionMeta(sessionId);
    if (!meta) return null;
    const items = await loadTranscript(sessionId);
    const tab: Session = {
      id: sessionId,
      title: meta.title,
      agentKind: meta.agentKind,
      cwd: meta.cwd,
      agentSessionId: meta.agentSessionId,
      status: "idle",
      error: null,
      createdAt: Date.now(),
      notes: await loadSessionNotes(sessionId),
      notesWidth: meta.notesWidth,
    };
    this.prependSession(tab);
    this.transcripts.set(sessionId, items);
    this.hydrated.add(sessionId);
    this.send("transcript:reset", { sessionId, items });
    return tab;
  }

  private send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}

function metaFromSession(tab: Session): SessionMeta {
  return {
    title: tab.title,
    agentKind: tab.agentKind,
    cwd: tab.cwd,
    agentSessionId: tab.agentSessionId,
    notesWidth: tab.notesWidth,
  };
}
