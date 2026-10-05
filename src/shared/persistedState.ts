import type { ActiveTabId } from "./activeTabId";
import type { AppSettings } from "./appSettings";

export interface PersistedState {
  version: 1;
  activeTabId: ActiveTabId;
  settings?: AppSettings;
  /** Pinned session ids in rail order (top section). */
  pinned: string[];
  /** Unpinned session ids in rail order (below pinned). */
  unpinned: string[];
}
