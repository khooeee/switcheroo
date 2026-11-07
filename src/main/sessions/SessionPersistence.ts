import type { PersistedState } from "../../shared/persistedState";
import { saveState } from "../storage/persist";
import { getAppSettings } from "../appSettings";
import { metaFromSession } from "../storage/metaFromSession";
import { saveSessionMeta } from "../storage/sessionMeta";
import { saveTranscript } from "../storage/sessionTranscripts";
import type { SessionState } from "./SessionState";

/** Writes app state, session meta and transcripts to disk. */
export class SessionPersistence {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly state: SessionState) {}

  async persist(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const { state } = this;
    await this.persistStateFile();
    await state.subagentTranscripts.flush();
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
      activeTabId: this.state.activeTabId ?? "",
      settings: getAppSettings(),
      pinned: [...this.state.railLists.pinnedIds],
      unpinned: [...this.state.railLists.unpinnedIds],
    };
    await saveState(state);
  }
}
