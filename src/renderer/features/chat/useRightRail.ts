import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveSessionId,
  Session,
  SwitchboardTurn,
  TranscriptTurn,
} from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

export type RightRailSelection = {
  sessionId: string;
  turnId: string;
  focusEventId?: string;
  focusKey: number;
  /** When true, RightRail takes keyboard focus after open/update. */
  takeFocus?: boolean;
};

export type RightRailView = {
  turn: TranscriptTurn;
  sessionId: string;
  session: Session | undefined;
  agent: string;
  cwd?: string;
  navigable?: boolean;
  focusEventId?: string;
  focusKey: number;
  takeFocus?: boolean;
};

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

  const closeRightRail = useCallback(() => setRightRail(null), []);

  const nextSelection = useCallback(
    (
      prev: RightRailSelection | null,
      sessionId: string,
      turnId: string,
      focusEventId?: string,
      takeFocus?: boolean,
    ): RightRailSelection => ({
      sessionId,
      turnId,
      focusEventId,
      focusKey: (prev?.focusKey ?? 0) + 1,
      takeFocus,
    }),
    [],
  );

  /** Toggle closed when activating the same message again; otherwise open / switch highlight. */
  const toggleSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      if (!activeSession) return;
      setRightRail((prev) => {
        if (
          prev?.sessionId === activeSession.id &&
          prev.turnId === turnId &&
          prev.focusEventId === focusEventId
        ) {
          return null;
        }
        return nextSelection(prev, activeSession.id, turnId, focusEventId);
      });
    },
    [activeSession, nextSelection],
  );

  const forceSessionRightRail = useCallback(
    (turnId: string, focusEventId?: string, takeFocus = false) => {
      if (!activeSession) return;
      setRightRail((prev) =>
        nextSelection(prev, activeSession.id, turnId, focusEventId, takeFocus),
      );
    },
    [activeSession, nextSelection],
  );

  const toggleSwitchboardRightRail = useCallback(
    (turnId: string, focusEventId?: string) => {
      const turn = switchboardTurns.find((entry) => entry.id === turnId);
      if (!turn) return;
      setRightRail((prev) => {
        if (
          prev?.sessionId === turn.sessionId &&
          prev.turnId === turnId &&
          prev.focusEventId === focusEventId
        ) {
          return null;
        }
        return nextSelection(prev, turn.sessionId, turnId, focusEventId);
      });
    },
    [switchboardTurns, nextSelection],
  );

  const forceSwitchboardRightRail = useCallback(
    (turnId: string, focusEventId?: string, takeFocus = false) => {
      const turn = switchboardTurns.find((entry) => entry.id === turnId);
      if (!turn) return;
      setRightRail((prev) =>
        nextSelection(prev, turn.sessionId, turnId, focusEventId, takeFocus),
      );
    },
    [switchboardTurns, nextSelection],
  );

  const rightRailView = useMemo((): RightRailView | null => {
    if (!rightRail) return null;
    if (activeSessionId === SWITCHBOARD_ID) {
      const turn = switchboardTurns.find((entry) => entry.id === rightRail.turnId);
      if (!turn) return null;
      const session = openSessions.find((entry) => entry.id === turn.sessionId);
      return {
        turn,
        sessionId: turn.sessionId,
        session,
        agent: turn.agent,
        cwd: session?.cwd,
        navigable: turn.navigable,
        focusEventId: rightRail.focusEventId,
        focusKey: rightRail.focusKey,
        takeFocus: rightRail.takeFocus,
      };
    }
    if (rightRail.sessionId !== activeSessionId) return null;
    const turn = (transcripts[rightRail.sessionId] ?? []).find(
      (entry) => entry.id === rightRail.turnId,
    );
    if (!turn || !activeSession) return null;
    return {
      turn,
      sessionId: activeSession.id,
      session: activeSession,
      agent: activeSession.agent,
      cwd: activeSession.cwd,
      focusEventId: rightRail.focusEventId,
      focusKey: rightRail.focusKey,
      takeFocus: rightRail.takeFocus,
    };
  }, [
    rightRail,
    activeSessionId,
    switchboardTurns,
    openSessions,
    transcripts,
    activeSession,
  ]);

  useEffect(() => {
    if (rightRail && !rightRailView) setRightRail(null);
  }, [rightRail, rightRailView]);

  return {
    rightRailView,
    closeRightRail,
    clearRightRail: closeRightRail,
    toggleSessionRightRail,
    forceSessionRightRail,
    toggleSwitchboardRightRail,
    forceSwitchboardRightRail,
  };
}
