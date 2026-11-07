import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { nextRightRailSelection, type RightRailSelection } from "./nextRightRailSelection";
import { resolveRightRailView } from "./resolveRightRailView";

type Selections = Record<string, RightRailSelection>;
type UpdateSelection = (prev: RightRailSelection | null) => RightRailSelection | null;

function isSameSelection(
  prev: RightRailSelection | null,
  sessionId: string,
  turnId: string,
  focusEventId?: string,
): boolean {
  return (
    prev?.sessionId === sessionId &&
    prev.turnId === turnId &&
    prev.focusEventId === focusEventId
  );
}

/** `all` with one tab's selection replaced (null closes that tab's rail); unchanged tabs keep identity. */
function withTabSelection(all: Selections, tabId: string, update: UpdateSelection): Selections {
  const prev = all[tabId] ?? null;
  const next = update(prev);
  if (next === prev) return all;
  const copy = { ...all };
  if (next) copy[tabId] = next;
  else delete copy[tabId];
  return copy;
}

/**
 * Selection + resolved turn (or subagent transcript) for the events right rail.
 * Each tab keeps its own selection, so switching away and back reopens the same rail.
 */
export function useRightRail({
  activeSession,
  transcripts,
  subagentTranscripts,
  loadingSubagents,
}: {
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}) {
  const [selections, setSelections] = useState<Selections>({});
  const sessionId = activeSession?.id;
  const selection = sessionId ? selections[sessionId] ?? null : null;
  // Callbacks read this through a ref/id so they stay stable while turns stream
  // (memoized transcript rows receive them as props).
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const updateTab = useCallback((key: string, update: UpdateSelection) => {
    setSelections((all) => withTabSelection(all, key, update));
  }, []);

  const closeRightRail = useCallback(() => {
    if (sessionIdRef.current) updateTab(sessionIdRef.current, () => null);
  }, [updateTab]);

  /** Toggle closed when activating the same message again; otherwise open / switch highlight. */
  const toggleSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      if (!sessionId) return;
      const next = nextRightRailSelection(sessionId, turnId, focusEventId);
      updateTab(sessionId, (prev) =>
        isSameSelection(prev, sessionId, turnId, focusEventId) ? null : next,
      );
    },
    [sessionId, updateTab],
  );

  const forceSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      if (!sessionId) return;
      const next = nextRightRailSelection(sessionId, turnId, focusEventId);
      updateTab(sessionId, () => next);
    },
    [sessionId, updateTab],
  );

  /** Show a subagent's transcript; selecting the open subagent again closes the rail. */
  const toggleSubagentRightRail = useCallback((subagentSessionId: string, subagentId: string) => {
    const key = sessionIdRef.current;
    if (!key) return;
    const next = { ...nextRightRailSelection(subagentSessionId, ""), subagentId };
    updateTab(key, (prev) =>
      prev?.sessionId === subagentSessionId && prev.subagentId === subagentId ? null : next,
    );
  }, [updateTab]);

  const rightRailView = useMemo(
    () =>
      resolveRightRailView({
        selection,
        activeSession,
        transcripts,
        subagentTranscripts,
        loadingSubagents,
      }),
    [
      selection,
      transcripts,
      activeSession,
      subagentTranscripts,
      loadingSubagents,
    ],
  );

  // Drop a selection whose turn (or session) is gone; other tabs' selections stay.
  useEffect(() => {
    if (sessionId && selection && !rightRailView) {
      updateTab(sessionId, (prev) => (prev === selection ? null : prev));
    }
  }, [sessionId, selection, rightRailView, updateTab]);

  return {
    rightRailView,
    closeRightRail,
    toggleSessionRightRail,
    forceSessionRightRail,
    toggleSubagentRightRail,
  };
}
