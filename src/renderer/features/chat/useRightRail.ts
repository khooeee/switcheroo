import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveSessionId,
  Session,
  SwitchboardTurn,
  TranscriptTurn,
} from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

export type RightRailSelection = { sessionId: string; turnId: string };

export type RightRailView = {
  turn: TranscriptTurn;
  sessionId: string;
  session: Session | undefined;
  agent: string;
  cwd?: string;
  navigable?: boolean;
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

  const toggleSessionRightRail = useCallback(
    (turnId: string) => {
      if (!activeSession) return;
      setRightRail((prev) =>
        prev?.sessionId === activeSession.id && prev.turnId === turnId
          ? null
          : { sessionId: activeSession.id, turnId },
      );
    },
    [activeSession],
  );

  const forceSessionRightRail = useCallback(
    (turnId: string) => {
      if (!activeSession) return;
      setRightRail({ sessionId: activeSession.id, turnId });
    },
    [activeSession],
  );

  const toggleSwitchboardRightRail = useCallback(
    (turnId: string) => {
      const turn = switchboardTurns.find((entry) => entry.id === turnId);
      if (!turn) return;
      setRightRail((prev) =>
        prev?.sessionId === turn.sessionId && prev.turnId === turnId
          ? null
          : { sessionId: turn.sessionId, turnId },
      );
    },
    [switchboardTurns],
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
  };
}
