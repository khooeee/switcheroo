import type { ActiveSessionId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../../shared/transcript";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import type { RightRailSelection } from "./nextRightRailSelection";

export type RightRailView = {
  turn: TranscriptTurn;
  sessionId: string;
  session: Session | undefined;
  agent: string;
  cwd?: string;
  focusEventId?: string;
  focusKey: number;
};

/** Find the selected turn in the active tab (Switchboard feed or session transcript). */
export function resolveRightRailView({
  selection,
  activeSessionId,
  activeSession,
  transcripts,
  switchboardTurns,
  openSessions,
}: {
  selection: RightRailSelection | null;
  activeSessionId: ActiveSessionId;
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  switchboardTurns: SwitchboardTurn[];
  openSessions: Session[];
}): RightRailView | null {
  if (!selection) return null;
  if (activeSessionId === SWITCHBOARD_ID) {
    const turn = switchboardTurns.find((entry) => entry.id === selection.turnId);
    if (!turn) return null;
    const session = openSessions.find((entry) => entry.id === turn.sessionId);
    return {
      turn,
      sessionId: turn.sessionId,
      session,
      agent: turn.agent,
      cwd: session?.cwd,
      focusEventId: selection.focusEventId,
      focusKey: selection.focusKey,
    };
  }
  if (selection.sessionId !== activeSessionId) return null;
  const turn = (transcripts[selection.sessionId] ?? []).find(
    (entry) => entry.id === selection.turnId,
  );
  if (!turn || !activeSession) return null;
  return {
    turn,
    sessionId: activeSession.id,
    session: activeSession,
    agent: activeSession.agent,
    cwd: activeSession.cwd,
    focusEventId: selection.focusEventId,
    focusKey: selection.focusKey,
  };
}
