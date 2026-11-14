import type { RailMode } from "../../../shared/railMode";
import { patchAppSettings } from "../settings/appSettingsCache";

let mode: RailMode = "sessions";
const listeners = new Set<() => void>();

function apply(next: RailMode): boolean {
  if (next === mode) return false;
  mode = next;
  listeners.forEach((listener) => listener());
  return true;
}

/** Sessions or File Explorer: one mode for the whole window, like VS Code's activity bar. Saved in settings. */
export const railModeStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): RailMode {
    return mode;
  },

  set(next: RailMode): void {
    if (apply(next)) void patchAppSettings({ railMode: next });
  },

  /** Take the saved mode at startup without writing it back. */
  restore(saved: unknown): void {
    apply(saved === "files" ? "files" : "sessions");
  },
};
