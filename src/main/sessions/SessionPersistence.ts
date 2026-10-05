import type { PersistedState } from "../../shared/persistedState";
import { saveState } from "../persist";
import { getAppSettings } from "../appSettings";
import { metaFromSession } from "../metaFromSession";
import { saveSessionMeta } from "../sessionMeta";
import { saveTranscript } from "../sessionTranscripts";
import { saveSwitchboardTurns } from "../switchboardEvents";
import { updateTabCwd } from "../tabs/updateTabCwd";
import type { SessionState } from "./SessionState";

/** Writes app state, Switchboard turns, session meta and transcripts to disk. */
export class SessionPersistence {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly state: SessionState) {}

  async persist(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const { state } = this;
    await this.persistTerminalCwds();
    await this.persistStateFile();
    await saveSwitchboardTurns(state.bus.list());
    await Promise.all(
      [...state.sessions.values()].map(async (session) => {
        await saveSessionMeta(session.id, metaFromSession(session));
        if (!state.hydrated.has(session.id)) return;
        await saveTranscript(session.id, state.transcripts.get(session.id) ?? []);
      }),
    );
  }

  /** Debounced persist for high-frequency updates. */
  queuePersist(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.persist();
    }, 300);
  }

  async persistStateFile(): Promise<void> {
    const state: PersistedState = {
      version: 1,
      activeTabId: this.state.activeTabId,
      settings: getAppSettings(),
      pinned: [...this.state.railLists.pinnedIds],
      unpinned: [...this.state.railLists.unpinnedIds],
    };
    await saveState(state);
  }

  private async persistTerminalCwds(): Promise<void> {
    const { terminals } = this.state;
    for (const session of this.state.sessions.values()) {
      let changed = false;
      let tabs = session.tabs;
      for (const tab of session.tabs) {
        if (tab.kind !== "terminal" || !terminals.has(tab.tabId)) continue;
        const cwd = await terminals.refreshCwd(tab.tabId);
        if (!cwd || cwd === tab.cwd) continue;
        tabs = updateTabCwd(tabs, tab.tabId, cwd);
        changed = true;
      }
      if (changed) session.tabs = tabs;
    }
  }
}
