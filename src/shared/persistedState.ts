import type { AppSettings } from "./appSettings";

export interface PersistedState {
  version: 1;
  /** Active session id, or "" for none (a string so older builds can still read this file). */
  activeTabId: string;
  settings?: AppSettings;
  /** Pinned session ids in rail order (top section). */
  pinned: string[];
  /** Unpinned session ids in rail order (below pinned). */
  unpinned: string[];
}
