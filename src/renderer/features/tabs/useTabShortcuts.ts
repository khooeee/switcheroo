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
      const order: ActiveTabId[] = [
        MASTER_TAB_ID,
        ...tabs.filter((tab) => !tab.closed).map((tab) => tab.id),
      ];

      if (event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && /^[1-9]$/.test(event.key)) {
        const target = order[Number(event.key) - 1];
        if (target !== undefined) {
          event.preventDefault();
          selectTab(target);
        }
        return;
      }

      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      const index = Math.max(0, order.indexOf(activeTabId));
      const step = event.shiftKey ? -1 : 1;
      const next = (index + step + order.length) % order.length;
      selectTab(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, activeTabId, selectTab, disabled]);
}
