import { randomUUID } from "node:crypto";
import * as path from "node:path";
import type { BrowserWindow } from "electron";
import type {
  ActiveTabId,
  CreateTabInput,
  MasterEvent,
  PersistedState,
  SessionTab,
  TabStatus,
  TranscriptItem,
} from "../shared/types";
import { MASTER_TAB_ID } from "../shared/types";
import { GlobalEventBus } from "./events";
import { AcpSession } from "./acp/session";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { agentLabel } from "./acp/presets";
import { loadState, saveState } from "./persist";
import { deleteSessionFolder, loadSessionMeta, saveSessionMeta, type SessionMeta } from "./sessionMeta";
import { loadSessionNotes, saveSessionNotes } from "./sessionNotes";
import { loadTranscript, saveTranscript } from "./sessionTranscripts";
import { loadSwitchboardEvents, saveSwitchboardEvents } from "./switchboardEvents";
import { stripCursorStreamNoise } from "../shared/cursorStreamNoise";
import { forkTabAtEvent } from "./forkTabAtEvent";
import { controlBootstrapText } from "./acp/controlBootstrapPrompt";
import { TabWaiters } from "./tabWaiters";

export class TabManager {
  private tabs = new Map<string, SessionTab>();
  private sessions = new Map<string, AcpSession>();
  private transcripts = new Map<string, TranscriptItem[]>();
  private activeTabId: ActiveTabId = MASTER_TAB_ID;
  private bus = new GlobalEventBus();
  private window: BrowserWindow | null = null;
  private permissionOwners = new Map<string, string>(); // requestId -> tabId
  private askOwners = new Map<string, string>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private waiters = new TabWaiters();

  setWindow(win: BrowserWindow): void {
    this.window = win;
    if (this.activeTabId !== MASTER_TAB_ID) this.refreshCommandsIfNeeded(this.activeTabId);
  }

  async init(): Promise<void> {
    const saved = await loadState();
    if (saved) {
      const openIds: string[] = [];
      for (const id of saved.tabs) {
        const meta = await loadSessionMeta(id);
        if (!meta) continue;
        openIds.push(id);
        this.tabs.set(id, {
          id,
          title: meta.title,
          agentKind: meta.agentKind,
          cwd: meta.cwd,
          sessionId: meta.sessionId,
          status: "idle",
          error: null,
          createdAt: Date.now(),
          notes: await loadSessionNotes(id),
          notesWidth: meta.notesWidth,
        });
        this.transcripts.set(id, await loadTranscript(id));
      }
      this.activeTabId =
        saved.activeTabId === MASTER_TAB_ID || openIds.includes(saved.activeTabId)
          ? saved.activeTabId
          : MASTER_TAB_ID;
      if (openIds.length !== saved.tabs.length) {
        await saveState({ version: 1, activeTabId: this.activeTabId, tabs: openIds });
      }
      const openTabIds = new Set(openIds);
      const masterEvents = await loadSwitchboardEvents();
      const navigableIds = new Set(openTabIds);
      for (const event of masterEvents) {
        if (navigableIds.has(event.tabId)) continue;
        if (await loadSessionMeta(event.tabId)) navigableIds.add(event.tabId);
      }
      this.bus.restore(
        masterEvents.map((e) => {
          const savedText = this.transcripts.get(e.tabId)?.find((item) => item.id === e.id)?.text;
          const summary = savedText
            ? e.agentKind === "cursor"
              ? stripCursorStreamNoise(savedText)
              : savedText
            : e.summary;
          return {
            id: e.id,
            tabId: e.tabId,
            agentKind: e.agentKind,
            at: e.at,
            kind: e.kind,
            summary,
            fileChanges: e.fileChanges,
            toolStatus: e.toolStatus,
            navigable: navigableIds.has(e.tabId),
          };
        }),
      );
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
      activeTabId: this.activeTabId,
      tabs: [...this.tabs.keys()],
    };
    await saveState(state);
    await saveSwitchboardEvents(this.bus.list());
    await Promise.all(
      [...this.tabs.values()].map(async (tab) => {
        await saveSessionMeta(tab.id, metaFromTab(tab));
        await saveSessionNotes(tab.id, tab.notes ?? "");
        await saveTranscript(tab.id, this.transcripts.get(tab.id) ?? []);
      }),
    );
  }

  list() {
    return {
      tabs: [...this.tabs.values()],
      activeTabId: this.activeTabId,
      masterEvents: this.bus.list(),
    };
  }

  async createTab(input: CreateTabInput): Promise<SessionTab> {
    const id = randomUUID();
    const title =
      input.title ??
      `${agentLabel(input.agentKind)} · ${path.basename(input.cwd)}`;
    const tab: SessionTab = {
      id,
      title,
      agentKind: input.agentKind,
      cwd: input.cwd,
      sessionId: null,
      status: "connecting",
      error: null,
      createdAt: Date.now(),
    };
    this.prependTab(tab);
    this.transcripts.set(id, []);
    this.activeTabId = id;
    this.emitTabs();

    const session = this.openSession(tab);
    this.sessions.set(id, session);

    try {
      await session.start();
      tab.sessionId = session.sessionId;
      this.emitTabs();
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
    tabId: string,
    timeoutMs: number,
  ): Promise<{ tabId: string; status: string; error: string | null }> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error("No tab");
    const pending = this.waiters.waitSettled(tabId, timeoutMs, {
      status: tab.status,
      error: tab.error,
    });
    const again = this.tabs.get(tabId);
    if (again) this.waiters.notifySettled(tabId, again.status, again.error);
    return pending;
  }

  async forkTab(tabId: string, eventId?: string): Promise<SessionTab> {
    return forkTabAtEvent({
      getTab: (id) => this.tabs.get(id),
      getTranscript: (id) => this.getTranscript(id),
      listTitles: () => [...this.tabs.values()].map((tab) => tab.title),
      ensureSession: async (tab) => this.ensureSession(tab),
      callbacksFor: (tab) => this.callbacksFor(tab),
      bus: () => this.bus,
      setSession: (id, session) => { this.sessions.set(id, session); },
      addTab: (tab, transcript) => {
        this.prependTab(tab);
        this.transcripts.set(tab.id, transcript);
      },
      setActiveTab: (id) => { this.activeTabId = id; },
      emitTabs: () => this.emitTabs(),
      send: (channel, payload) => this.send(channel, payload),
      persist: () => this.persist(),
    }, tabId, eventId);
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    await saveSessionMeta(tabId, metaFromTab(tab));
    await saveSessionNotes(tabId, tab.notes ?? "");
    await saveTranscript(tabId, this.transcripts.get(tabId) ?? []);
    const session = this.sessions.get(tabId);
    if (session) {
      await session.dispose();
      this.sessions.delete(tabId);
    }
    this.tabs.delete(tabId);
    this.transcripts.delete(tabId);
    if (this.activeTabId === tabId) this.activeTabId = MASTER_TAB_ID;
    this.emitTabs();
    void this.persist();
  }

  async deleteTab(tabId: string): Promise<void> {
    if (!this.tabs.has(tabId) && !(await loadSessionMeta(tabId))) return;
    const session = this.sessions.get(tabId);
    this.sessions.delete(tabId);
    if (session) {
      try {
        await session.dispose();
      } catch {
        /* the session is being removed either way */
      }
    }
    this.tabs.delete(tabId);
    this.transcripts.delete(tabId);
    await deleteSessionFolder(tabId);
    if (this.activeTabId === tabId) this.activeTabId = MASTER_TAB_ID;
    const events = this.bus.removeTab(tabId);
    this.emitTabs();
    this.send("master:reset", events);
    await this.persist();
  }

  renameTab(tabId: string, title: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.title = title;
    this.emitTabs();
    void this.persist();
  }

  setTabNotes(tabId: string, notes: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.notes = notes;
    this.queuePersist();
  }

  setTabNotesWidth(tabId: string, width: number): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.notesWidth = Number.isFinite(width) ? Math.round(width) : tab.notesWidth;
    this.queuePersist();
  }

  reorderTabs(tabIds: string[]): void {
    const requested = tabIds.filter((id) => this.tabs.has(id));
    const next = new Map<string, SessionTab>();
    for (const id of requested) {
      const tab = this.tabs.get(id);
      if (tab) next.set(id, tab);
    }
    for (const [id, tab] of this.tabs) {
      if (!next.has(id)) next.set(id, tab);
    }
    this.tabs = next;
    this.emitTabs();
    void this.persist();
  }

  setActiveTab(tabId: ActiveTabId): void {
    if (tabId !== MASTER_TAB_ID && !this.tabs.has(tabId)) return;
    this.activeTabId = tabId;
    this.emitTabs();
    void this.persist();
    if (tabId !== MASTER_TAB_ID) this.refreshCommandsIfNeeded(tabId);
  }

  async navigateToEvent(tabId: string, eventId: string): Promise<void> {
    if (!this.tabs.has(tabId)) {
      const reopened = await this.reopenTab(tabId);
      if (!reopened) return;
    }
    this.activeTabId = tabId;
    this.emitTabs();
    this.send("navigate-event", { tabId, eventId });
    void this.persist();
    this.refreshCommandsIfNeeded(tabId);
  }

  async sendPrompt(tabId: string, text: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error("No tab");
    const session = await this.ensureSession(tab);
    try {
      await session.prompt(text);
    } finally {
      await this.persist();
    }
  }

  async cancelPrompt(tabId: string): Promise<void> {
    await this.sessions.get(tabId)?.cancel();
    await this.persist();
  }

  respondPermission(requestId: string, optionId: string | "cancelled"): void {
    const tabId = this.permissionOwners.get(requestId);
    if (!tabId) return;
    this.permissionOwners.delete(requestId);
    this.sessions.get(tabId)?.respondPermission(requestId, optionId);
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    const tabId = this.askOwners.get(requestId);
    if (!tabId) return;
    this.askOwners.delete(requestId);
    this.sessions.get(tabId)?.respondAskQuestion(requestId, outcome);
  }

  getTranscript(tabId: string): TranscriptItem[] {
    return this.transcripts.get(tabId) ?? [];
  }

  async disposeAll(): Promise<void> {
    await this.persist();
    for (const s of this.sessions.values()) {
      await s.dispose();
    }
  }

  private handleTranscript(
    tabId: string,
    item: TranscriptItem,
    replaceId?: string,
  ): void {
    if (!this.tabs.has(tabId)) return;
    const list = this.transcripts.get(tabId) ?? [];
    if (replaceId) {
      const idx = list.findIndex((i) => i.id === replaceId);
      if (idx >= 0) {
        list[idx] = item.role === "tool" ? item : {
          ...list[idx],
          text: list[idx].text + item.text,
          at: item.at,
        };
        this.transcripts.set(tabId, list);
        this.send("transcript", { tabId, item: list[idx], replaceId });
        return;
      }
    }
    list.push(item);
    this.transcripts.set(tabId, list);
    this.send("transcript", { tabId, item });
  }

  private setStatus(
    tabId: string,
    status: TabStatus,
    error: string | null,
  ): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.status = status;
    tab.error = error;
    this.send("tab-status", { tabId, status, error });
    this.emitTabs();
    this.waiters.notifySettled(tabId, status, error);
  }

  private queuePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, 300);
  }

  private prependTab(tab: SessionTab): void {
    const next = new Map<string, SessionTab>();
    next.set(tab.id, tab);
    for (const [id, existing] of this.tabs) {
      if (id !== tab.id) next.set(id, existing);
    }
    this.tabs = next;
  }

  private emitTabs(): void {
    this.send("tabs:changed", {
      tabs: [...this.tabs.values()],
      activeTabId: this.activeTabId,
    });
  }

  private openSession(tab: SessionTab): AcpSession {
    return new AcpSession(tab.id, tab.agentKind, tab.cwd, this.bus, this.callbacksFor(tab));
  }

  private refreshCommandsIfNeeded(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.sessionId) return;
    void this.refreshCommands(tab).catch((error) => {
      console.error("[tabs] failed to refresh slash commands", error);
    });
  }

  private async refreshCommands(tab: SessionTab): Promise<void> {
    try {
      await Promise.race([
        this.ensureSession(tab, { quiet: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timed out refreshing slash commands")), 45_000);
        }),
      ]);
    } catch (error) {
      const session = this.sessions.get(tab.id);
      if (session && !session.sessionId) {
        this.sessions.delete(tab.id);
        await session.dispose().catch(() => undefined);
      }
      throw error;
    }
  }

  private async ensureSession(tab: SessionTab, options?: { quiet?: boolean }): Promise<AcpSession> {
    let session = this.sessions.get(tab.id);
    if (!session) {
      session = this.openSession(tab);
      this.sessions.set(tab.id, session);
    }
    if (session.sessionId) return session;
    tab.slashCommands = undefined;
    this.emitTabs();
    if (tab.sessionId) await session.attachExisting(tab.sessionId, options);
    else await session.start();
    tab.sessionId = session.sessionId;
    this.emitTabs();
    return session;
  }

  private callbacksFor(tab: SessionTab): SessionCallbacks {
    return {
      onPromptComplete: () => {
        this.send("prompt:complete", { tabId: tab.id });
      },
      onTranscript: (item, replaceId) => this.handleTranscript(tab.id, item, replaceId),
      onStatus: (status, error) => this.setStatus(tab.id, status, error ?? null),
      onSteeringSupport: (supported) => {
        tab.supportsSteering = supported;
        this.emitTabs();
      },
      onUsage: (usage) => {
        tab.usage = usage;
        this.emitTabs();
      },
      onAvailableCommands: (commands) => {
        tab.slashCommands = commands;
        this.emitTabs();
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
    };
  }

  private async reopenTab(tabId: string): Promise<SessionTab | null> {
    const meta = await loadSessionMeta(tabId);
    if (!meta) return null;
    const items = await loadTranscript(tabId);
    const tab: SessionTab = {
      id: tabId,
      title: meta.title,
      agentKind: meta.agentKind,
      cwd: meta.cwd,
      sessionId: meta.sessionId,
      status: "idle",
      error: null,
      createdAt: Date.now(),
      notes: await loadSessionNotes(tabId),
      notesWidth: meta.notesWidth,
    };
    this.prependTab(tab);
    this.transcripts.set(tabId, items);
    this.send("transcript:reset", { tabId, items });
    return tab;
  }

  private send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}

function metaFromTab(tab: SessionTab): SessionMeta {
  return {
    title: tab.title,
    agentKind: tab.agentKind,
    cwd: tab.cwd,
    sessionId: tab.sessionId,
    notesWidth: tab.notesWidth,
  };
}
