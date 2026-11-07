import { useEffect, useRef } from "react";
import { dialogOpen } from "./dialogOpen";
import { modKey } from "./modKey";

/** Cmd/Ctrl+`key` runs `onFocus` while `enabled`, unless a dialog or menu is open. `onFocus` must be stable. */
export function useFocusShortcut(key: string, enabled: boolean, onFocus: () => void): void {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!modKey(event, key) || event.repeat) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (!enabledRef.current) return;
      if (dialogOpen()) return;
      if (document.querySelector('[role="menu"]')) return;

      event.preventDefault();
      event.stopPropagation();
      onFocus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [key, onFocus]);
}
