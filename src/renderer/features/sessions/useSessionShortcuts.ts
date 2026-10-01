import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { flatRailSessions } from "./flatRailSessions";
import { useEffect } from "react";

export function useSessionShortcuts(
  pinned: Session[],
  unpinned: Session[],
  activeSessionId: ActiveSessionId,
  selectSession: (id: ActiveSessionId) => void,
  disabled: boolean,
) {
  useEffect(() => {
    const ids = flatRailSessions(pinned, unpinned).map((session) => session.id);
    const order: ActiveSessionId[] = [SWITCHBOARD_ID, ...ids];
    const step = (delta: number) => {
      if (disabled || order.length === 0) return;
      const index = Math.max(0, order.indexOf(activeSessionId));
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

      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    };
    const onNext = () => step(1);
    const onPrev = () => step(-1);
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:session-next", onNext);
    window.addEventListener("switcheroo:session-prev", onPrev);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:session-next", onNext);
      window.removeEventListener("switcheroo:session-prev", onPrev);
    };
  }, [pinned, unpinned, activeSessionId, selectSession, disabled]);
}
