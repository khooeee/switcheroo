import { explorerChanges } from "./explorerChanges";

const tops = new Map<string, number>();

/** Scroll offset of each session's file tree, kept outside React so scrolling never re-renders. */
export const treeScrollMemory = {
  get(sessionId: string): number | undefined {
    return tops.get(sessionId);
  },

  set(sessionId: string, top: number): void {
    if (tops.get(sessionId) === top) return;
    tops.set(sessionId, top);
    explorerChanges.notify(sessionId);
  },
};
