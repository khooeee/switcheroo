import { useEffect } from "react";
import type { ActiveTabId, SessionTab } from "../../../shared/types";
import { MASTER_TAB_ID } from "../../../shared/types";

export function useTabShortcuts(
  tabs: SessionTab[],
  activeTabId: ActiveTabId,
  selectTab: (id: ActiveTabId) => void,
  disabled: boolean,
) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing) return;
      const sessions = tabs.map((tab) => tab.id);
      const order: ActiveTabId[] = [MASTER_TAB_ID, ...sessions];
      if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
        && /^[0-9]$/.test(event.key)) {
        const target = event.key === "0" ? MASTER_TAB_ID : sessions[Number(event.key) - 1];
        if (target === undefined) return;
        event.preventDefault();
        selectTab(target);
        return;
      }

      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      const index = Math.max(0, order.indexOf(activeTabId));
      const step = event.shiftKey ? -1 : 1;
      selectTab(order[(index + step + order.length) % order.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, activeTabId, selectTab, disabled]);
}
