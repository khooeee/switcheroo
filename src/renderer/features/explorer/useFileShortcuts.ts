import { useEffect } from "react";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { modKey } from "../shortcuts/modKey";
import { railModeStore } from "./railModeStore";

/** Cmd+S / Cmd+F / Cmd+W → the active file's save, search and close events. */
const FILE_KEYS: Record<string, string> = {
  s: "switcheroo:save-file",
  f: "switcheroo:find-in-file",
  w: "switcheroo:close-file",
};

/** Ctrl+Tab / Ctrl+Shift+Tab (no Cmd or Alt). */
function ctrlTab(event: KeyboardEvent): boolean {
  return event.key === "Tab" && event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * In File Explorer mode, Cmd+S saves, Cmd+F searches and Cmd+W closes the active file, and
 * Ctrl+Tab / Ctrl+Shift+Tab step through the open files, wherever focus is (editor or tree).
 * Capture phase, registered before the session shortcuts, so they never see these keys there.
 */
export function useFileShortcuts(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (railModeStore.getSnapshot() !== "files" || event.isComposing || dialogOpen()) return;
      if (ctrlTab(event)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent(event.shiftKey ? "switcheroo:prev-file" : "switcheroo:next-file"));
        return;
      }
      const key = Object.keys(FILE_KEYS).find((name) => modKey(event, name));
      if (!key) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) window.dispatchEvent(new CustomEvent(FILE_KEYS[key]));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
