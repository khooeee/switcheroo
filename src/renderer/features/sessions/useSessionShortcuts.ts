import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { visibleTabOrder } from "../../../shared/tabNav/visibleTabOrder";
import { useEffect } from "react";
import { modKey } from "../shortcuts/modKey";

function toggleActivePin(pinned: Session[], activeTabId: ActiveTabId) {
  if (!activeTabId) return;
  if (pinned.some((session) => session.id === activeTabId)) {
    void window.switcheroo.unpinSession(activeTabId);
    return;
  }
  void window.switcheroo.pinSession(activeTabId);
}

export function useSessionShortcuts(
  pinned: Session[],
  unpinned: Session[],
  activeTabId: ActiveTabId,
  selectTab: (id: string) => void,
  disabled: boolean,
  filterQuery = "",
) {
  useEffect(() => {
    const order = visibleTabOrder(pinned, unpinned, filterQuery);
    const step = (delta: number) => {
      if (disabled || order.length === 0) return;
      const index = activeTabId ? order.indexOf(activeTabId) : -1;
      if (index < 0) {
        const fallback = delta > 0 ? order[0] : order[order.length - 1];
        if (fallback !== undefined) selectTab(fallback);
        return;
      }
      const next = order[(index + delta + order.length) % order.length];
      if (next !== undefined) selectTab(next);
    };

    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing) return;
      if (modKey(event, "p", true)) {
        event.preventDefault();
        toggleActivePin(pinned, activeTabId);
        return;
      }

      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pinned, unpinned, activeTabId, selectTab, disabled, filterQuery]);
}
