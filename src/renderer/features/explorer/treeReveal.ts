const pending = new Set<string>();

/** Sessions whose tree should scroll its selected row into view once that row has loaded. */
export const treeReveal = {
  request(sessionId: string): void {
    pending.add(sessionId);
  },

  isPending(sessionId: string): boolean {
    return pending.has(sessionId);
  },

  done(sessionId: string): void {
    pending.delete(sessionId);
  },
};
