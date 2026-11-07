import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { sessionIdForTab } from "../../../shared/tabNav/sessionIdForTab";

/** Session ids with an unread completed turn; cleared when that chat is active. */
export function useSessionUnreadDots(activeTabId: ActiveTabId, sessions: Session[]) {
  const [unread, setUnread] = useState(() => new Set<string>());
  const activeId = sessionIdForTab(activeTabId, sessions);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

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
    if (!activeId) return;
    setUnread((prev) => {
      if (!prev.has(activeId)) return prev;
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
  }, [activeId]);

  const toggleUnread = useCallback((sessionId: string) => {
    setUnread((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }, []);

  useEffect(() => {
    void window.switcheroo.setActiveSessionUnread(!!activeId && unread.has(activeId));
  }, [activeId, unread]);

  return { unread, toggleUnread };
}
