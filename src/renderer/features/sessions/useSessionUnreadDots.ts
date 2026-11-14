import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";

/** Session ids with an unread completed turn; cleared when that chat is active. */
export function useSessionUnreadDots(activeTabId: ActiveTabId) {
  const [unread, setUnread] = useState(() => new Set<string>());
  const activeRef = useRef(activeTabId);
  activeRef.current = activeTabId;

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
    if (!activeTabId) return;
    setUnread((prev) => {
      if (!prev.has(activeTabId)) return prev;
      const next = new Set(prev);
      next.delete(activeTabId);
      return next;
    });
  }, [activeTabId]);

  const toggleUnread = useCallback((sessionId: string) => {
    setUnread((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }, []);

  return { unread, toggleUnread };
}
