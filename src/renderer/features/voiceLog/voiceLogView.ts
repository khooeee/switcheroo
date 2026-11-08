let open = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (next === open) return;
  open = next;
  listeners.forEach((listener) => listener());
}

/** Whether the main pane shows the Voice Log instead of the active session. */
export const voiceLogView = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): boolean {
    return open;
  },

  toggle(): void {
    set(!open);
  },

  close(): void {
    set(false);
  },
};
