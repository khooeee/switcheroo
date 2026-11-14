import { isUntitledPath } from "../editor/isUntitledPath";
import { ancestorPaths } from "./ancestorPaths";
import { explorerChanges } from "./explorerChanges";
import type { ExplorerState } from "./ExplorerState";

const EMPTY: ExplorerState = { expanded: [], selected: null, openFiles: [], activeFile: null, previewFile: null };

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

/** Expand each folder in `dirs` that is closed. */
function expandFolders(sessionId: string, dirs: readonly string[]): void {
  update(sessionId, (prev) => {
    const closed = dirs.filter((dir) => !prev.expanded.includes(dir));
    return closed.length ? { ...prev, expanded: [...prev.expanded, ...closed] } : prev;
  });
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

  /** Open (or switch to) a file tab that stays open, and highlight its row. */
  openFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      const openFiles = prev.openFiles.includes(path) ? prev.openFiles : [...prev.openFiles, path];
      const previewFile = prev.previewFile === path ? null : prev.previewFile;
      if (
        openFiles === prev.openFiles &&
        previewFile === prev.previewFile &&
        prev.activeFile === path &&
        prev.selected === path
      ) {
        return prev;
      }
      return { ...prev, openFiles, activeFile: path, selected: path, previewFile };
    });
  },

  /**
   * Show a file in the preview tab, in place of the file previewed before; returns that file.
   * A file that already has a tab just gets focus.
   */
  previewFile(sessionId: string, path: string): string | null {
    const { openFiles, previewFile: replaced } = explorerStore.get(sessionId);
    if (openFiles.includes(path)) {
      explorerStore.activateFile(sessionId, path);
      return null;
    }
    update(sessionId, (prev) => ({
      ...prev,
      openFiles: replaced === null ? [...prev.openFiles, path] : prev.openFiles.map((p) => (p === replaced ? path : p)),
      activeFile: path,
      selected: path,
      previewFile: path,
    }));
    return replaced;
  },

  /** Keep the preview tab open: the next previewed file no longer replaces it. */
  pinFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => (prev.previewFile === path ? { ...prev, previewFile: null } : prev));
  },

  /** Open a file tab with its folders expanded, so its row shows in the tree (an untitled tab has no row). */
  revealFile(sessionId: string, path: string): void {
    if (!isUntitledPath(path)) expandFolders(sessionId, ancestorPaths(path));
    explorerStore.openFile(sessionId, path);
  },

  /** Save As: tab `from` now shows file `to`, in the same place; a tab `to` already had goes away. */
  renameFile(sessionId: string, from: string, to: string): void {
    expandFolders(sessionId, ancestorPaths(to));
    update(sessionId, (prev) => {
      if (from === to || !prev.openFiles.includes(from)) return prev;
      const renamed = (path: string | null) => (path === from ? to : path);
      return {
        ...prev,
        openFiles: prev.openFiles.filter((path) => path !== to).map((path) => (path === from ? to : path)),
        activeFile: renamed(prev.activeFile),
        selected: renamed(prev.selected),
        previewFile: prev.previewFile === from || prev.previewFile === to ? null : prev.previewFile,
      };
    });
  },

  /** Expand a folder and the folders holding it, and highlight its row. */
  revealFolder(sessionId: string, path: string): void {
    expandFolders(sessionId, [...ancestorPaths(path), path]);
    explorerStore.select(sessionId, path);
  },

  /** Switch to the tab `delta` places along (wrapping), highlighting its row. */
  cycleFile(sessionId: string, delta: number): void {
    const { openFiles, activeFile } = explorerStore.get(sessionId);
    if (openFiles.length === 0) return;
    const index = activeFile === null ? -1 : openFiles.indexOf(activeFile);
    const start = index < 0 ? (delta > 0 ? -1 : 0) : index;
    explorerStore.activateFile(sessionId, openFiles[(start + delta + openFiles.length) % openFiles.length]);
  },

  /** Switch to an open tab and highlight its row. */
  activateFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      if (prev.activeFile === path && prev.selected === path) return prev;
      return { ...prev, activeFile: path, selected: path };
    });
  },

  closeFile(sessionId: string, path: string): void {
    update(sessionId, (prev) => {
      if (!prev.openFiles.includes(path)) return prev;
      const activeFile = prev.activeFile === path ? neighborTab(prev.openFiles, path) : prev.activeFile;
      const previewFile = prev.previewFile === path ? null : prev.previewFile;
      return { ...prev, openFiles: prev.openFiles.filter((p) => p !== path), activeFile, previewFile };
    });
  },
};
