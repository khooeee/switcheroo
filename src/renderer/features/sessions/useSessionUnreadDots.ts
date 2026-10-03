import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveSessionId } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

/** Session ids with an unread completed turn; cleared when that session becomes active. */
export function useSessionUnreadDots(activeSessionId: ActiveSessionId) {
  const [unread, setUnread] = useState(() => new Set<string>());
  const activeRef = useRef(activeSessionId);
  activeRef.current = activeSessionId;

  useEffect(() => {
    return window.switcheroo.onPromptComplete(({ sessionId }) => {
      if (sessionId === activeRef.current) return;
      setUnread((prev) => {
        if (prev.has(sessionId)) return prev;
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    setUnread((prev) => {
      if (!prev.has(activeSessionId)) return prev;
      const next = new Set(prev);
      next.delete(activeSessionId);
      return next;
    });
  }, [activeSessionId]);

  const markUnread = useCallback((sessionId: string) => {
    setUnread((prev) => {
      if (prev.has(sessionId)) return prev;
      const next = new Set(prev);
      next.add(sessionId);
      return next;
    });
  }, []);

  return { unread, markUnread };
}
