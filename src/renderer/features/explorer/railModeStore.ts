import type { RailMode } from "../../../shared/railMode";
import { patchAppSettings } from "../settings/appSettingsCache";

let mode: RailMode = "sessions";
let hasSessions = false;
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
    return hasSessions ? mode : "sessions";
  },

  set(next: RailMode): void {
    if (next === "files" && !hasSessions) return;
    if (apply(next)) void patchAppSettings({ railMode: next });
  },

  /** Called with each loaded session list; closing the last session also leaves Files mode. */
  setHasSessions(available: boolean): void {
    if (hasSessions === available && (available || mode === "sessions")) return;
    hasSessions = available;
    if (!available && mode === "files") {
      mode = "sessions";
      void patchAppSettings({ railMode: "sessions" });
    }
    listeners.forEach((listener) => listener());
  },

  /** Take the saved mode at startup without writing it back. */
  restore(saved: unknown): void {
    // Keep the preference until the initial session list tells us whether Files is available.
    apply(saved === "files" ? "files" : "sessions");
  },
};
