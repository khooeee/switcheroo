import type { PersistedExplorer } from "../../../shared/persistedExplorer";
import { errorMessage } from "../../../shared/errorMessage";
import { fileScrollMemory } from "../editor/fileScrollMemory";
import { isUntitledPath } from "../editor/isUntitledPath";
import { explorerChanges } from "./explorerChanges";
import { explorerStore } from "./explorerStore";
import { treeScrollMemory } from "./treeScrollMemory";

const SAVE_DELAY_MS = 400;

const restored = new Set<string>();
const restoring = new Map<string, Promise<void>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

/** Untitled tabs live only while the app runs, so the saved state leaves them out. */
function snapshot(sessionId: string): PersistedExplorer {
  const state = explorerStore.get(sessionId);
  const openFiles = state.openFiles.filter((path) => !isUntitledPath(path));
  const onDisk = (path: string | null) => (path !== null && isUntitledPath(path) ? null : path);
  const tops = Object.entries(fileScrollMemory.forSession(sessionId)).filter(([path]) => !isUntitledPath(path));
  return {
    expanded: [...state.expanded],
    selected: onDisk(state.selected),
    openFiles,
    activeFile: onDisk(state.activeFile) ?? openFiles[openFiles.length - 1] ?? null,
    previewFile: state.previewFile,
    treeScrollTop: treeScrollMemory.get(sessionId) ?? 0,
    fileTops: Object.fromEntries(tops),
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

  /** Load the session's saved state once; resolves when it is back (or failed to load). */
  ensureRestored(sessionId: string): Promise<void> {
    if (restored.has(sessionId)) return Promise.resolve();
    const pending = restoring.get(sessionId);
    if (pending) return pending;
    const loading = window.switcheroo.getExplorerState(sessionId)
      .then((saved) => {
        if (!saved) return;
        treeScrollMemory.set(sessionId, saved.treeScrollTop);
        fileScrollMemory.restore(sessionId, saved.fileTops);
        explorerStore.restore(sessionId, {
          expanded: saved.expanded,
          selected: saved.selected,
          openFiles: saved.openFiles,
          activeFile: saved.activeFile,
          previewFile: saved.previewFile,
        });
      })
      .catch((err: unknown) => console.warn(`[explorer] restore for ${sessionId} failed:`, errorMessage(err)))
      .finally(() => {
        restoring.delete(sessionId);
        restored.add(sessionId);
        listeners.forEach((listener) => listener());
      });
    restoring.set(sessionId, loading);
    return loading;
  },

  /** Write every pending save now (before quitting). */
  async flush(): Promise<void> {
    const pending = [...timers.keys()];
    pending.forEach((sessionId) => clearTimeout(timers.get(sessionId)));
    await Promise.all(pending.map(save));
  },
};
