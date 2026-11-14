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
