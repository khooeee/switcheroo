import { ancestorPaths } from "./ancestorPaths";
import { explorerChanges } from "./explorerChanges";
import type { ExplorerState } from "./ExplorerState";

const EMPTY: ExplorerState = { expanded: [], selected: null, openFiles: [], activeFile: null };

let states: Record<string, ExplorerState> = {};
const listeners = new Set<() => void>();

/** Replace one session's state; other sessions keep their identity. */
function update(sessionId: string, change: (prev: ExplorerState) => ExplorerState): void {
  const prev = states[sessionId] ?? EMPTY;
  const next = change(prev);
  if (next === prev) return;
  states = { ...states, [sessionId]: next };
  listeners.forEach((listener) => listener());
  explorerChanges.notify(sessionId);
}

/** The tab that takes over when `path` closes: the one to its right, else its left. */
function neighborTab(openFiles: readonly string[], path: string): string | null {
  const index = openFiles.indexOf(path);
  return openFiles[index + 1] ?? openFiles[index - 1] ?? null;
}

/** Each session's explorer tree and editor tabs, kept while the app runs. */
export const explorerStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  get(sessionId: string): ExplorerState {
    return states[sessionId] ?? EMPTY;
  },

  /** Put back saved state, unless the user already changed this session's explorer. */
  restore(sessionId: string, saved: ExplorerState): void {
    update(sessionId, (prev) => (prev === EMPTY ? saved : prev));
  },

  setExpanded(sessionId: string, path: string, open: boolean): void {
    update(sessionId, (prev) => {
      if (prev.expanded.includes(path) === open) return prev;
      const expanded = open ? [...prev.expanded, path] : prev.expanded.filter((p) => p !== path);
      return { ...prev, expanded };
    });
  },

  select(sessionId: string, path: string | null): void {
    update(sessionId, (prev) => (prev.selected === path ? prev : { ...prev, selected: path }));
  },

  /** Open (or switch to) a file tab and highlight its row. */
  openFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      const openFiles = prev.openFiles.includes(path) ? prev.openFiles : [...prev.openFiles, path];
      if (openFiles === prev.openFiles && prev.activeFile === path && prev.selected === path) return prev;
      return { ...prev, openFiles, activeFile: path, selected: path };
    });
  },

  /** Open a file tab with its folders expanded, so its row shows in the tree. */
  revealFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      const closed = ancestorPaths(path).filter((dir) => !prev.expanded.includes(dir));
      return closed.length ? { ...prev, expanded: [...prev.expanded, ...closed] } : prev;
    });
    explorerStore.openFile(sessionId, path);
  },

  /** Switch to the tab `delta` places along (wrapping), highlighting its row. */
  cycleFile(sessionId: string, delta: number): void {
    const { openFiles, activeFile } = explorerStore.get(sessionId);
    if (openFiles.length === 0) return;
    const index = activeFile === null ? -1 : openFiles.indexOf(activeFile);
    const start = index < 0 ? (delta > 0 ? -1 : 0) : index;
    explorerStore.openFile(sessionId, openFiles[(start + delta + openFiles.length) % openFiles.length]);
  },

  activateFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => (prev.activeFile === path ? prev : { ...prev, activeFile: path }));
  },

  closeFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      if (!prev.openFiles.includes(path)) return prev;
      const activeFile = prev.activeFile === path ? neighborTab(prev.openFiles, path) : prev.activeFile;
      return { ...prev, openFiles: prev.openFiles.filter((p) => p !== path), activeFile };
    });
  },
};
