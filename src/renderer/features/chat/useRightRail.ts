import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveSessionId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../../shared/transcript";
import { nextRightRailSelection, type RightRailSelection } from "./nextRightRailSelection";
import { resolveRightRailView } from "./resolveRightRailView";

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

/** Selection + resolved turn for the events right rail. */
export function useRightRail({
  activeSessionId,
  activeSession,
  transcripts,
  switchboardTurns,
  openSessions,
}: {
  activeSessionId: ActiveSessionId;
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  switchboardTurns: SwitchboardTurn[];
  openSessions: Session[];
}) {
  const [rightRail, setRightRail] = useState<RightRailSelection | null>(null);
  // Callbacks read these through refs/ids so they stay stable while turns stream
  // (memoized transcript and Switchboard rows receive them as props).
  const sessionId = activeSession?.id;
  const switchboardTurnsRef = useRef(switchboardTurns);
  switchboardTurnsRef.current = switchboardTurns;

  const closeRightRail = useCallback(() => setRightRail(null), []);

  /** Toggle closed when activating the same message again; otherwise open / switch highlight. */
  const toggleSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      if (!sessionId) return;
      setRightRail((prev) =>
        isSameSelection(prev, sessionId, turnId, focusEventId)
          ? null
          : nextRightRailSelection(prev, sessionId, turnId, focusEventId),
      );
    },
    [sessionId],
  );

  const forceSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      if (!sessionId) return;
      setRightRail((prev) => nextRightRailSelection(prev, sessionId, turnId, focusEventId));
    },
    [sessionId],
  );

  const toggleSwitchboardRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      const turn = switchboardTurnsRef.current.find((entry) => entry.id === turnId);
      if (!turn) return;
      setRightRail((prev) =>
        isSameSelection(prev, turn.sessionId, turnId, focusEventId)
          ? null
          : nextRightRailSelection(prev, turn.sessionId, turnId, focusEventId),
      );
    },
    [],
  );

  const rightRailView = useMemo(
    () =>
      resolveRightRailView({
        selection: rightRail,
        activeSessionId,
        activeSession,
        transcripts,
        switchboardTurns,
        openSessions,
      }),
    [rightRail, activeSessionId, switchboardTurns, openSessions, transcripts, activeSession],
  );

  useEffect(() => {
    if (rightRail && !rightRailView) setRightRail(null);
  }, [rightRail, rightRailView]);

  return {
    rightRailView,
    closeRightRail,
    toggleSessionRightRail,
    forceSessionRightRail,
    toggleSwitchboardRightRail,
  };
}
