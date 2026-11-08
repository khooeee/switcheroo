let openTurnId: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null): void {
  if (next === openTurnId) return;
  openTurnId = next;
  listeners.forEach((listener) => listener());
}

/** Which voice turn the Voice Log's Turn Details rail shows; null when closed. */
export const voiceTurnDetails = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): string | null {
    return openTurnId;
  },

  toggle(turnId: string): void {
    set(openTurnId === turnId ? null : turnId);
  },

  close(): void {
    set(null);
  },
};
