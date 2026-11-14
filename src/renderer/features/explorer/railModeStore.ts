import type { RailMode } from "../../../shared/railMode";

let mode: RailMode = "sessions";
const listeners = new Set<() => void>();

/** Sessions or File Explorer: one mode for the whole window, like VS Code's activity bar. */
export const railModeStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): RailMode {
    return mode;
  },

  set(next: RailMode): void {
    if (next === mode) return;
    mode = next;
    listeners.forEach((listener) => listener());
  },
};
