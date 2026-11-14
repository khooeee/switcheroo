import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPendingFindScope,
  takePendingFindScope,
} from "../find/pendingFindScope";
import type { ActiveTabId } from "../../../shared/activeTabId";

interface TabFind {
  open: boolean;
  query: string;
}

const CLOSED: TabFind = { open: false, query: "" };

/** Find-bar open/query/scope + Find-in-history modal state. */
export function useFindUiState(activeTabId: ActiveTabId) {
  const [showFindInSessions, setShowFindInSessions] = useState(false);
  // Like Chrome, each tab remembers whether find was open and its query.
  const [findByTab, setFindByTab] = useState<Record<string, TabFind>>({});
  const tabKey = activeTabId ?? "";
  const tabKeyRef = useRef(tabKey);
  tabKeyRef.current = tabKey;
  const { open: findOpen, query: findQuery } = findByTab[tabKey] ?? CLOSED;
  // True only on the render that switches tabs, so a restored bar knows not to grab focus.
  const shownTabKey = useRef(tabKey);
  const findFromTabSwitch = shownTabKey.current !== tabKey;
  useEffect(() => {
    shownTabKey.current = tabKey;
  }, [tabKey]);
  const [findScope, setFindScope] = useState<HTMLElement | null>(null);
  const findScopeRef = useRef<HTMLElement | null>(null);
  findScopeRef.current = findScope;

  /** Patch the active tab's find state; stable so shortcut listeners stay subscribed. */
  const updateTabFind = useCallback((patch: Partial<TabFind>) => {
    const key = tabKeyRef.current;
    setFindByTab((prev) => ({ ...prev, [key]: { ...(prev[key] ?? CLOSED), ...patch } }));
  }, []);

  const setFindQuery = useCallback((query: string) => updateTabFind({ query }), [updateTabFind]);

  const closeFind = useCallback(() => {
    updateTabFind(CLOSED);
    setFindScope(null);
    clearPendingFindScope();
  }, [updateTabFind]);

  /** Open (unscoped) or close the find bar. */
  const setFindVisible = useCallback((open: boolean) => {
    if (!open) {
      closeFind();
      return;
    }
    clearPendingFindScope();
    setFindScope(null);
    updateTabFind({ open: true });
  }, [closeFind, updateTabFind]);

  useEffect(() => {
    const onScoped = () => {
      const el = takePendingFindScope();
      if (!el) return;
      setFindScope(el);
      updateTabFind({ open: true });
    };
    window.addEventListener("switcheroo:find-scoped", onScoped);
    return () => window.removeEventListener("switcheroo:find-scoped", onScoped);
  }, [updateTabFind]);

  // A message scope points into the old tab's DOM, so it does not survive a switch.
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
    findFocusKey: tabKey,
    findFromTabSwitch,
    findScope,
    findScopeRef,
    closeFind,
    setFindVisible,
  };
}
