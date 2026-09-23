import { randomUUID } from "node:crypto";
import * as path from "node:path";
import type { BrowserWindow } from "electron";
import type {
  ActiveTabId,
  AgentKind,
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
import { agentLabel } from "./acp/presets";
import { loadState, saveState } from "./persist";
import { stripCursorStreamNoise } from "../shared/cursorStreamNoise";

export class TabManager {
  private tabs = new Map<string, SessionTab>();
  private sessions = new Map<string, AcpSession>();
  private transcripts = new Map<string, TranscriptItem[]>();
  private activeTabId: ActiveTabId = MASTER_TAB_ID;
  private bus = new GlobalEventBus();
  private window: BrowserWindow | null = null;
  private permissionOwners = new Map<string, string>(); // requestId -> tabId
  private askOwners = new Map<string, string>();

  setWindow(win: BrowserWindow): void {
    this.window = win;
  }

  async init(): Promise<void> {
    const saved = await loadState();
    if (saved) {
      this.activeTabId = saved.activeTabId;
      const openTabIds = new Set(saved.tabs.map((t) => t.id));
      this.bus.restore(
        saved.masterEvents.map((e) => {
          const savedText = saved.transcripts[e.tabId]?.find((item) => item.id === e.id)?.text;
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
            navigable: openTabIds.has(e.tabId),
          };
        }),
      );
      for (const t of saved.tabs) {
        this.tabs.set(t.id, {
          ...t,
          status: "idle",
          error: null,
          createdAt: Date.now(),
          closed: t.closed ?? false,
        });
        this.transcripts.set(t.id, saved.transcripts[t.id] ?? []);
      }
    }

    this.bus.on("event", (event: MasterEvent) => {
      this.send("master:event", event);
    });
  }

  async persist(): Promise<void> {
    const state: PersistedState = {
      version: 1,
      activeTabId: this.activeTabId,
      tabs: [...this.tabs.values()].map((t) => ({
        id: t.id,
        title: t.title,
        agentKind: t.agentKind,
        cwd: t.cwd,
        sessionId: t.sessionId,
        closed: t.closed,
      })),
      transcripts: Object.fromEntries(this.transcripts),
      masterEvents: this.bus.list(),
    };
    await saveState(state);
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
      closed: false,
    };
    this.tabs.set(id, tab);
    this.transcripts.set(id, []);
    this.activeTabId = id;
    this.emitTabs();

    const session = this.openSession(tab);
    this.sessions.set(id, session);

    try {
      await session.start();
      tab.sessionId = session.sessionId;
      this.emitTabs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus(id, "error", msg);
    }

    void this.persist();
    return tab;
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.closed) return;
    const session = this.sessions.get(tabId);
    if (session) {
      await session.dispose();
      this.sessions.delete(tabId);
    }
    tab.closed = true;
    tab.status = "idle";
    tab.error = null;
    if (this.activeTabId === tabId) {
      this.activeTabId = MASTER_TAB_ID;
    }
    this.emitTabs();
    void this.persist();
  }

  async deleteTab(tabId: string): Promise<void> {
    if (!this.tabs.has(tabId)) return;
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

  reorderTabs(tabIds: string[]): void {
    const requested = tabIds.filter((id) => {
      const tab = this.tabs.get(id);
      return tab && !tab.closed;
    });
    let index = 0;
    const next = new Map<string, SessionTab>();
    for (const [, tab] of this.tabs) {
      if (tab.closed) {
        next.set(tab.id, tab);
        continue;
      }
      const nextId = requested[index++];
      const openTab = nextId ? this.tabs.get(nextId) : undefined;
      if (openTab) next.set(openTab.id, openTab);
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
  }

  navigateToEvent(tabId: string, eventId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.closed) {
      tab.closed = false;
      this.tabs.delete(tabId);
      this.tabs.set(tabId, tab);
    }
    this.activeTabId = tabId;
    this.emitTabs();
    this.send("navigate-event", { tabId, eventId });
    void this.persist();
  }

  async sendPrompt(tabId: string, text: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error("No tab");

    let session = this.sessions.get(tabId);
    if (!session) {
      session = this.openSession(tab);
      this.sessions.set(tabId, session);
      await session.start();
      tab.sessionId = session.sessionId;
      this.emitTabs();
    } else if (!session.sessionId) {
      await session.start();
      tab.sessionId = session.sessionId;
      this.emitTabs();
    }

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
        list[idx] = {
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
  }

  private emitTabs(): void {
    this.send("tabs:changed", {
      tabs: [...this.tabs.values()],
      activeTabId: this.activeTabId,
    });
  }

  private openSession(tab: SessionTab): AcpSession {
    return new AcpSession(tab.id, tab.agentKind, tab.cwd, this.bus, {
      onTranscript: (item, replaceId) => this.handleTranscript(tab.id, item, replaceId),
      onStatus: (status, error) => this.setStatus(tab.id, status, error ?? null),
      onSteeringSupport: (supported) => {
        tab.supportsSteering = supported;
        this.emitTabs();
      },
      onPermission: (req) => {
        this.permissionOwners.set(req.requestId, tab.id);
        this.send("permission", req);
      },
      onAskQuestion: (req) => {
        this.askOwners.set(req.requestId, tab.id);
        this.send("ask-question", req);
      },
    });
  }

  private send(channel: string, payload: unknown): void {
    this.window?.webContents.send(channel, payload);
  }
}
