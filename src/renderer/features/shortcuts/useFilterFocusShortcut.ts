import { useEffect, useRef } from "react";
import { dialogOpen } from "./dialogOpen";

/** Cmd+K focuses the "Filter tabs" field. Cmd only, so Ctrl+K stays kill-line in terminals and the prompt. */
export function useFilterFocusShortcut(blocked: boolean): void {
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !event.metaKey) return;
      if (event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (blockedRef.current) return;
      if (dialogOpen()) return;
      if (document.querySelector('[role="menu"]')) return;

      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("switcheroo:focus-filter"));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
