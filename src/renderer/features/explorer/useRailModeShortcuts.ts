import { useEffect } from "react";
import { railModeStore } from "./railModeStore";

/**
 * View → Toggle File Explorer (Cmd+Shift+E) switches modes. Going to the prompt from File Explorer
 * mode switches back to Sessions and repeats the command once shown.
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
    window.addEventListener("switcheroo:focus-prompt", backToSessions);
    return () => {
      window.removeEventListener("switcheroo:toggle-explorer", toggle);
      window.removeEventListener("switcheroo:focus-prompt", backToSessions);
    };
  }, []);
}
