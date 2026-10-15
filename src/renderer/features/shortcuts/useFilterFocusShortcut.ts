import { useEffect, useRef } from "react";
import { dialogOpen } from "./dialogOpen";
import { modKey } from "./modKey";

/** Cmd/Ctrl+G focuses the "Filter tabs" field. */
export function useFilterFocusShortcut(blocked: boolean): void {
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!modKey(event, "g") || event.repeat) return;
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
