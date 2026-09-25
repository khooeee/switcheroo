import { useEffect } from "react";

/** Focus the active session notes textarea (Cmd/Ctrl+Shift+N). */
export function useFocusNotesShortcut(enabled: boolean) {
  useEffect(() => {
    const focusNotes = () => {
      if (!enabled) return;
      document.querySelector<HTMLTextAreaElement>(".tab-notes textarea")?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.isComposing || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      focusNotes();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:focus-notes", focusNotes);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:focus-notes", focusNotes);
    };
  }, [enabled]);
}
