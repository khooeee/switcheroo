import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveTabId, Session } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { sessionIdForTab } from "../../../shared/tabNav";

/** Session ids with an unread completed turn; cleared when that chat group is active. */
export function useSessionUnreadDots(activeTabId: ActiveTabId, sessions: Session[]) {
  const [unread, setUnread] = useState(() => new Set<string>());
  const parentId = sessionIdForTab(activeTabId, sessions);
  const parentRef = useRef(parentId);
  parentRef.current = parentId;

  useEffect(() => {
    return window.switcheroo.onPromptComplete(({ sessionId }) => {
      if (sessionId === parentRef.current) return;
      setUnread((prev) => {
        if (prev.has(sessionId)) return prev;
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (!parentId) return;
    setUnread((prev) => {
      if (!prev.has(parentId)) return prev;
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
  }, [parentId]);

  const toggleUnread = useCallback((sessionId: string) => {
    setUnread((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }, []);

  useEffect(() => {
    const isUnread =
      activeTabId !== SWITCHBOARD_ID &&
      !!parentId &&
      parentId === activeTabId &&
      unread.has(parentId);
    void window.switcheroo.setActiveSessionUnread(isUnread);
  }, [activeTabId, parentId, unread]);

  return { unread, toggleUnread };
}
