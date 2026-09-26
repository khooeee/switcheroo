import { useEffect } from "react";
import type { ActiveSessionId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

export function useSessionShortcuts(
  sessions: Session[],
  activeSessionId: ActiveSessionId,
  selectSession: (id: ActiveSessionId) => void,
  disabled: boolean,
) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing) return;
      const ids = sessions.map((session) => session.id);
      const order: ActiveSessionId[] = [SWITCHBOARD_ID, ...ids];
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
      const index = Math.max(0, order.indexOf(activeSessionId));
      const step = event.shiftKey ? -1 : 1;
      selectSession(order[(index + step + order.length) % order.length]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessions, activeSessionId, selectSession, disabled]);
}
