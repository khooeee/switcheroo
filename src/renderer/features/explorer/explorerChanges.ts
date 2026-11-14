const listeners = new Set<(sessionId: string) => void>();

/** Fires with a session id whenever anything saved in its explorer.json changes (tree, tabs, scroll). */
export const explorerChanges = {
  notify(sessionId: string): void {
    listeners.forEach((listener) => listener(sessionId));
  },

  subscribe(listener: (sessionId: string) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
