import { useEffect } from "react";
import type { ActiveTabId } from "../../../shared/types";

/** Focus the active rail tab button (Cmd/Ctrl+Shift+E). */
export function useFocusRailShortcut(activeTabId: ActiveTabId, enabled: boolean) {
  useEffect(() => {
    const focusRail = () => {
      if (!enabled) return;
      const el = document.querySelector<HTMLElement>(
        `.rail [data-rail-id="${CSS.escape(activeTabId)}"]`,
      );
      el?.focus();
      el?.scrollIntoView({ block: "nearest" });
    };
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.isComposing || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      focusRail();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:focus-rail", focusRail);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:focus-rail", focusRail);
    };
  }, [activeTabId, enabled]);
}
