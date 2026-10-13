import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
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
  tabId,
  activeSession,
  transcripts,
  switchboardTurns,
  openSessions,
  subagentTranscripts,
  loadingSubagents,
}: {
  /** Tab whose rail is shown (Switchboard or a chat); null on terminal tabs, which have none. */
  tabId: ActiveTabId | null;
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  switchboardTurns: SwitchboardTurn[];
  openSessions: Session[];
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}) {
  const [selections, setSelections] = useState<Selections>({});
  const selection = tabId ? selections[tabId] ?? null : null;
  // Callbacks read these through refs/ids so they stay stable while turns stream
  // (memoized transcript and Switchboard rows receive them as props).
  const sessionId = activeSession?.id;
  const tabIdRef = useRef(tabId);
  tabIdRef.current = tabId;
  const switchboardTurnsRef = useRef(switchboardTurns);
  switchboardTurnsRef.current = switchboardTurns;

  const updateTab = useCallback((key: string, update: UpdateSelection) => {
    setSelections((all) => withTabSelection(all, key, update));
  }, []);

  const closeRightRail = useCallback(() => {
    if (tabIdRef.current) updateTab(tabIdRef.current, () => null);
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

  const toggleSwitchboardRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      const turn = switchboardTurnsRef.current.find((entry) => entry.id === turnId);
      if (!turn) return;
      const next = nextRightRailSelection(turn.sessionId, turnId, focusEventId);
      updateTab(SWITCHBOARD_ID, (prev) =>
        isSameSelection(prev, turn.sessionId, turnId, focusEventId) ? null : next,
      );
    },
    [updateTab],
  );

  /** Show a subagent's transcript; selecting the open subagent again closes the rail. */
  const toggleSubagentRightRail = useCallback((subagentSessionId: string, subagentId: string) => {
    const key = tabIdRef.current;
    if (!key) return;
    const next = { ...nextRightRailSelection(subagentSessionId, ""), subagentId };
    updateTab(key, (prev) =>
      prev?.sessionId === subagentSessionId && prev.subagentId === subagentId ? null : next,
    );
  }, [updateTab]);

  const rightRailView = useMemo(
    () =>
      tabId
        ? resolveRightRailView({
            selection,
            activeSessionId: tabId,
            activeSession,
            transcripts,
            switchboardTurns,
            openSessions,
            subagentTranscripts,
            loadingSubagents,
          })
        : null,
    [
      tabId,
      selection,
      switchboardTurns,
      openSessions,
      transcripts,
      activeSession,
      subagentTranscripts,
      loadingSubagents,
    ],
  );

  // Drop a selection whose turn (or session) is gone; other tabs' selections stay.
  useEffect(() => {
    if (tabId && selection && !rightRailView) {
      updateTab(tabId, (prev) => (prev === selection ? null : prev));
    }
  }, [tabId, selection, rightRailView, updateTab]);

  return {
    rightRailView,
    closeRightRail,
    toggleSessionRightRail,
    forceSessionRightRail,
    toggleSwitchboardRightRail,
    toggleSubagentRightRail,
  };
}
