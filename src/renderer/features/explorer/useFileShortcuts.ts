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

/**
 * In File Explorer mode, Cmd+S saves, Cmd+F searches and Cmd+W closes the active file, wherever
 * focus is (editor or tree). Capture phase, so the session shortcuts never see them there.
 */
export function useFileShortcuts(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (railModeStore.getSnapshot() !== "files" || event.isComposing || dialogOpen()) return;
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
