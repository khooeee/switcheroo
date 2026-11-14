import type { PersistedExplorer } from "../../../shared/persistedExplorer";
import { errorMessage } from "../../../shared/errorMessage";
import { fileScrollMemory } from "../editor/fileScrollMemory";
import { explorerChanges } from "./explorerChanges";
import { explorerStore } from "./explorerStore";
import { treeScrollMemory } from "./treeScrollMemory";

const SAVE_DELAY_MS = 400;

const restored = new Set<string>();
const restoring = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function snapshot(sessionId: string): PersistedExplorer {
  const state = explorerStore.get(sessionId);
  return {
    expanded: [...state.expanded],
    selected: state.selected,
    openFiles: [...state.openFiles],
    activeFile: state.activeFile,
    treeScrollTop: treeScrollMemory.get(sessionId) ?? 0,
    fileTops: fileScrollMemory.forSession(sessionId),
  };
}

async function save(sessionId: string): Promise<void> {
  timers.delete(sessionId);
  await window.switcheroo.saveExplorerState(sessionId, snapshot(sessionId)).catch((err: unknown) => {
    console.warn(`[explorer] save for ${sessionId} failed:`, errorMessage(err));
  });
}

// Only save a session once its saved state is back, so an empty explorer never overwrites it.
explorerChanges.subscribe((sessionId) => {
  if (!restored.has(sessionId) || timers.has(sessionId)) return;
  timers.set(sessionId, setTimeout(() => void save(sessionId), SAVE_DELAY_MS));
});

/** Loads each session's explorer.json on first use and writes changes back shortly after. */
export const explorerPersistence = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  isRestored(sessionId: string): boolean {
    return restored.has(sessionId);
  },

  ensureRestored(sessionId: string): void {
    if (restored.has(sessionId) || restoring.has(sessionId)) return;
    restoring.add(sessionId);
    void window.switcheroo.getExplorerState(sessionId)
      .then((saved) => {
        if (!saved) return;
        treeScrollMemory.set(sessionId, saved.treeScrollTop);
        fileScrollMemory.restore(sessionId, saved.fileTops);
        explorerStore.restore(sessionId, {
          expanded: saved.expanded,
          selected: saved.selected,
          openFiles: saved.openFiles,
          activeFile: saved.activeFile,
        });
      })
      .catch((err: unknown) => console.warn(`[explorer] restore for ${sessionId} failed:`, errorMessage(err)))
      .finally(() => {
        restoring.delete(sessionId);
        restored.add(sessionId);
        listeners.forEach((listener) => listener());
      });
  },

  /** Write every pending save now (before quitting). */
  async flush(): Promise<void> {
    const pending = [...timers.keys()];
    pending.forEach((sessionId) => clearTimeout(timers.get(sessionId)));
    await Promise.all(pending.map(save));
  },
};
