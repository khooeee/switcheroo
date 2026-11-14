import { useEffect } from "react";
import { railModeStore } from "./railModeStore";

/** Session commands whose target lives in the (hidden) session list or chat. */
const SESSION_FOCUS_EVENTS = ["switcheroo:focus-prompt", "switcheroo:focus-filter", "switcheroo:rename-session"];

/**
 * View → Toggle File Explorer (Cmd+Shift+E) switches modes. Going to the prompt, the filter, or
 * renaming from File Explorer mode switches back to Sessions and repeats the command once shown.
 */
export function useRailModeShortcuts(): void {
  useEffect(() => {
    const toggle = () => {
      railModeStore.set(railModeStore.getSnapshot() === "files" ? "sessions" : "files");
    };
    const backToSessions = (event: Event) => {
      if (railModeStore.getSnapshot() !== "files") return;
      railModeStore.set("sessions");
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(event.type)));
    };
    window.addEventListener("switcheroo:toggle-explorer", toggle);
    SESSION_FOCUS_EVENTS.forEach((name) => window.addEventListener(name, backToSessions));
    return () => {
      window.removeEventListener("switcheroo:toggle-explorer", toggle);
      SESSION_FOCUS_EVENTS.forEach((name) => window.removeEventListener(name, backToSessions));
    };
  }, []);
}
