import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPendingFindScope,
  takePendingFindScope,
} from "../find/pendingFindScope";
import type { ActiveTabId } from "../../../shared/activeTabId";

/** Find-bar open/query/scope + Find-in-history modal state. */
export function useFindUiState(activeTabId: ActiveTabId) {
  const [showFindInSessions, setShowFindInSessions] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findScope, setFindScope] = useState<HTMLElement | null>(null);
  const findScopeRef = useRef<HTMLElement | null>(null);
  findScopeRef.current = findScope;

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindQuery("");
    setFindScope(null);
    clearPendingFindScope();
  }, []);

  /** Open (unscoped) or close the find bar; stable so shortcut listeners stay subscribed. */
  const setFindVisible = useCallback((open: boolean) => {
    if (!open) {
      closeFind();
      return;
    }
    clearPendingFindScope();
    setFindScope(null);
    setFindOpen(true);
  }, [closeFind]);

  useEffect(() => {
    const onScoped = () => {
      const el = takePendingFindScope();
      if (!el) return;
      setFindScope(el);
      setFindOpen(true);
    };
    window.addEventListener("switcheroo:find-scoped", onScoped);
    return () => window.removeEventListener("switcheroo:find-scoped", onScoped);
  }, []);

  useEffect(() => {
    setFindScope(null);
    clearPendingFindScope();
  }, [activeTabId]);

  useEffect(() => {
    if (!findScope) return;
    findScope.classList.add("find-scope");
    return () => findScope.classList.remove("find-scope");
  }, [findScope]);

  return {
    showFindInSessions,
    setShowFindInSessions,
    findOpen,
    findQuery,
    setFindQuery,
    findScope,
    findScopeRef,
    closeFind,
    setFindVisible,
  };
}
