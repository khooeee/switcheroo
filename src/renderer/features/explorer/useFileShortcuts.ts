import { useEffect } from "react";
import { goToFileOpen } from "../goToFile/goToFileOpen";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { modKey } from "../shortcuts/modKey";
import { railModeStore } from "./railModeStore";

/** Cmd+S / Cmd+F / Cmd+W → the active file's save, search and close events; Cmd+P → Go to File; Cmd+N → a new untitled file. */
const FILE_KEYS: Record<string, string> = {
  s: "switcheroo:save-file",
  f: "switcheroo:find-in-file",
  w: "switcheroo:close-file",
  p: "switcheroo:go-to-file",
  n: "switcheroo:new-file",
};

/** The file event a key press stands for; Cmd+Shift+S is Save As. */
function fileCommand(event: KeyboardEvent): string | undefined {
  if (modKey(event, "s", true)) return "switcheroo:save-file-as";
  const key = Object.keys(FILE_KEYS).find((name) => modKey(event, name));
  return key ? FILE_KEYS[key] : undefined;
}

/** Ctrl+Tab / Ctrl+Shift+Tab (no Cmd or Alt). */
function ctrlTab(event: KeyboardEvent): boolean {
  return event.key === "Tab" && event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * In File Explorer mode, Cmd+S saves, Cmd+F searches and Cmd+W closes the active file, Cmd+P opens
 * Go to File, Cmd+N opens an untitled file, Cmd+Shift+S saves under another name, and Ctrl+Tab /
 * Ctrl+Shift+Tab step through the open files, wherever focus is (editor or tree).
 * Capture phase, registered before the session shortcuts, so they never see these keys there.
 * While Go to File is open the keys are still taken (else Cmd+W would close the session), but only Cmd+P acts.
 */
export function useFileShortcuts(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (railModeStore.getSnapshot() !== "files" || event.isComposing) return;
      const picking = goToFileOpen();
      if (dialogOpen() && !picking) return;
      if (ctrlTab(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (picking) return;
        window.dispatchEvent(new CustomEvent(event.shiftKey ? "switcheroo:prev-file" : "switcheroo:next-file"));
        return;
      }
      const command = fileCommand(event);
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      if (picking && command !== FILE_KEYS.p) return;
      if (!event.repeat) window.dispatchEvent(new CustomEvent(command));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
