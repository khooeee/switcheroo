import { explorerChanges } from "../explorer/explorerChanges";

/** Session id → file path → document position at the top of that file's viewport. */
const tops = new Map<string, Map<string, number>>();

/** Where each open file was scrolled to, kept outside React so scrolling never re-renders. */
export const fileScrollMemory = {
  get(sessionId: string, path: string): number | undefined {
    return tops.get(sessionId)?.get(path);
  },

  set(sessionId: string, path: string, top: number): void {
    let session = tops.get(sessionId);
    if (session?.get(path) === top) return;
    if (!session) tops.set(sessionId, (session = new Map()));
    session.set(path, top);
    explorerChanges.notify(sessionId);
  },

  delete(sessionId: string, path: string): void {
    if (tops.get(sessionId)?.delete(path)) explorerChanges.notify(sessionId);
  },

  /** A file saved under another path keeps its position there. */
  move(sessionId: string, from: string, to: string): void {
    const session = tops.get(sessionId);
    if (!session) return;
    const top = session.get(from);
    session.delete(from);
    if (top === undefined) session.delete(to);
    else session.set(to, top);
    explorerChanges.notify(sessionId);
  },

  forSession(sessionId: string): Record<string, number> {
    return Object.fromEntries(tops.get(sessionId) ?? []);
  },

  restore(sessionId: string, saved: Record<string, number>): void {
    tops.set(sessionId, new Map(Object.entries(saved)));
  },
};
