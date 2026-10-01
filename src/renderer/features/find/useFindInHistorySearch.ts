import { useEffect, useMemo, useRef, useState } from "react";
import type { FindInSessionsHit } from "../../../shared/types";
import { groupFindHits } from "./groupFindHits";

/** Search state for Find in History; survives modal close while the hook stays mounted. */
export function useFindInHistorySearch(open: boolean) {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<FindInSessionsHit[]>([]);
  const [scanned, setScanned] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const searchIdRef = useRef(0);
  const pendingHitsRef = useRef<FindInSessionsHit[]>([]);
  const progressRef = useRef({ scanned: 0, total: 0 });

  const trimmed = query.trim();
  const queryMatchesSearch = searchedQuery !== null && searchedQuery === trimmed;
  const groups = useMemo(() => groupFindHits(hits), [hits]);
  const visibleHits = useMemo(
    () => groups.flatMap((group) => (collapsed.has(group.sessionId) ? [] : group.hits)),
    [groups, collapsed],
  );
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsed.has(group.sessionId));
  const scanComplete = searching && totalSessions > 0 && scanned >= totalSessions;
  const showToggleAll = !searching && groups.length > 0 && hits.length < 1000;

  const publishHits = (next: FindInSessionsHit[]) => {
    const sessionIds = [...new Set(next.map((hit) => hit.sessionId))];
    setHits(next);
    setCollapsed(sessionIds.length <= 5 ? new Set() : new Set(sessionIds));
    setSelected(0);
  };

  useEffect(() => {
    const unsubProgress = window.switcheroo.onFindProgress(({
      searchId,
      scanned: nextScanned,
      total,
    }) => {
      if (searchId !== searchIdRef.current) return;
      progressRef.current = { scanned: nextScanned, total };
      setScanned(nextScanned);
      setTotalSessions(total);
    });
    const unsubChunk = window.switcheroo.onFindChunk(({ searchId, added }) => {
      if (searchId !== searchIdRef.current) return;
      if (added.length) pendingHitsRef.current.push(...added);
    });
    const unsubDone = window.switcheroo.onFindDone(({ searchId }) => {
      if (searchId !== searchIdRef.current) return;
      setScanned(progressRef.current.scanned);
      setTotalSessions(progressRef.current.total);
      setSearching(false);
      publishHits(pendingHitsRef.current.slice());
    });
    return () => {
      unsubProgress();
      unsubChunk();
      unsubDone();
      void window.switcheroo.stopFindInSessions();
    };
  }, []);

  useEffect(() => {
    if (!open && searching) void window.switcheroo.stopFindInSessions();
  }, [open, searching]);

  const runSearch = () => {
    if (!trimmed || searching) return;
    pendingHitsRef.current = [];
    setHits([]);
    setScanned(0);
    setTotalSessions(0);
    setCollapsed(new Set());
    setSelected(0);
    setSearchedQuery(trimmed);
    setSearching(true);
    const searchId = searchIdRef.current + 1;
    searchIdRef.current = searchId;
    void window.switcheroo.findInSessions(trimmed, searchId);
  };

  const stopSearch = () => {
    void window.switcheroo.stopFindInSessions();
  };

  const toggleGroup = (sessionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
    setSelected(0);
  };

  const toggleAllGroups = () => {
    if (allCollapsed) setCollapsed(new Set());
    else setCollapsed(new Set(groups.map((group) => group.sessionId)));
    setSelected(0);
  };

  const emptyLabel = (() => {
    if (searching) return null;
    if (searchedQuery === null || !queryMatchesSearch) return "Type a query and press Enter.";
    if (hits.length === 0) return "No matches";
    return null;
  })();

  return {
    query,
    setQuery,
    searchedQuery,
    searching,
    scanned,
    totalSessions,
    scanComplete,
    groups,
    visibleHits,
    collapsed,
    selected,
    setSelected,
    allCollapsed,
    showToggleAll,
    queryMatchesSearch,
    emptyLabel,
    runSearch,
    stopSearch,
    toggleGroup,
    toggleAllGroups,
  };
}
