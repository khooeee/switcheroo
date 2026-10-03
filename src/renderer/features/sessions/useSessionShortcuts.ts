import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { MAX_PINNED_SESSIONS } from "../../../shared/maxPinnedSessions";
import { flatRailSessions } from "./flatRailSessions";
import { sessionMatchesFilter } from "./sessionMatchesFilter";
import { useEffect } from "react";

function toggleActivePin(pinned: Session[], unpinned: Session[], activeSessionId: ActiveSessionId) {
  if (activeSessionId === SWITCHBOARD_ID) return;
  if (pinned.some((session) => session.id === activeSessionId)) {
    void window.switcheroo.unpinSession(activeSessionId);
    return;
  }
  if (pinned.length >= MAX_PINNED_SESSIONS) return;
  if (!unpinned.some((session) => session.id === activeSessionId)) return;
  void window.switcheroo.pinSession(activeSessionId);
}

export function useSessionShortcuts(
  pinned: Session[],
  unpinned: Session[],
  activeSessionId: ActiveSessionId,
  selectSession: (id: ActiveSessionId) => void,
  disabled: boolean,
  filterQuery = "",
) {
  useEffect(() => {
    const visiblePinned = pinned.filter((session) => sessionMatchesFilter(session, filterQuery));
    const visibleUnpinned = unpinned.filter((session) => sessionMatchesFilter(session, filterQuery));
    const ids = flatRailSessions(visiblePinned, visibleUnpinned).map((session) => session.id);
    // Switchboard stays visible above the filter; Tab cycles it with matching sessions only.
    const order: ActiveSessionId[] = [SWITCHBOARD_ID, ...ids];
    const step = (delta: number) => {
      if (disabled || order.length === 0) return;
      const index = order.indexOf(activeSessionId);
      if (index < 0) {
        const fallback = delta > 0 ? order[0] : order[order.length - 1];
        if (fallback !== undefined) selectSession(fallback);
        return;
      }
      const next = order[(index + delta + order.length) % order.length];
      if (next !== undefined) selectSession(next);
    };

    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
        && /^[0-9]$/.test(event.key)) {
        const target = event.key === "0" ? SWITCHBOARD_ID : ids[Number(event.key) - 1];
        if (target === undefined) return;
        event.preventDefault();
        selectSession(target);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !(event.metaKey && event.ctrlKey)
        && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        toggleActivePin(pinned, unpinned, activeSessionId);
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
      toggleActivePin(pinned, unpinned, activeSessionId);
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
  }, [pinned, unpinned, activeSessionId, selectSession, disabled, filterQuery]);
}
