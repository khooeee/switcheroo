import type { ActiveTabId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { sessionIdForTab, visibleTabOrder } from "../../../shared/tabNav";
import { useEffect } from "react";

function toggleActivePin(pinned: Session[], unpinned: Session[], activeTabId: ActiveTabId) {
  const parentId = sessionIdForTab(activeTabId, [...pinned, ...unpinned]);
  if (!parentId || activeTabId !== parentId) return;
  if (pinned.some((session) => session.id === parentId)) {
    void window.switcheroo.unpinSession(parentId);
    return;
  }
  if (pinned.length >= MAX_PINNED_SESSIONS) return;
  if (!unpinned.some((session) => session.id === parentId)) return;
  void window.switcheroo.pinSession(parentId);
}

export function useSessionShortcuts(
  pinned: Session[],
  unpinned: Session[],
  activeTabId: ActiveTabId,
  selectTab: (id: ActiveTabId) => void,
  disabled: boolean,
  filterQuery = "",
) {
  useEffect(() => {
    const order = visibleTabOrder(pinned, unpinned, filterQuery);
    const step = (delta: number) => {
      if (disabled || order.length === 0) return;
      const index = order.indexOf(activeTabId);
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
      if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key === "0") {
        event.preventDefault();
        selectTab(SWITCHBOARD_ID);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !(event.metaKey && event.ctrlKey)
        && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        toggleActivePin(pinned, unpinned, activeTabId);
        return;
      }

      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    };
    const onNext = () => step(1);
    const onPrev = () => step(-1);
    const onTogglePin = () => {
      if (disabled) return;
      toggleActivePin(pinned, unpinned, activeTabId);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:session-next", onNext);
    window.addEventListener("switcheroo:session-prev", onPrev);
    window.addEventListener("switcheroo:toggle-pin", onTogglePin);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:session-next", onNext);
      window.removeEventListener("switcheroo:session-prev", onPrev);
      window.removeEventListener("switcheroo:toggle-pin", onTogglePin);
    };
  }, [pinned, unpinned, activeTabId, selectTab, disabled, filterQuery]);
}
