import type { ActiveSessionId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../../shared/transcript";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import type { RightRailSelection } from "./nextRightRailSelection";
import type { RightRailView } from "./RightRailView";
import { resolveSubagentRailView } from "../subagents/resolveSubagentRailView";

/** Find the selected turn (or subagent) in the active tab (Switchboard feed or session transcript). */
export function resolveRightRailView({
  selection,
  activeSessionId,
  activeSession,
  transcripts,
  switchboardTurns,
  openSessions,
  subagentTranscripts,
  loadingSubagents,
}: {
  selection: RightRailSelection | null;
  activeSessionId: ActiveSessionId;
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  switchboardTurns: SwitchboardTurn[];
  openSessions: Session[];
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}): RightRailView | null {
  if (!selection) return null;
  if (selection.subagentId) {
    return resolveSubagentRailView({
      selection,
      subagentId: selection.subagentId,
      activeSessionId,
      activeSession,
      openSessions,
      transcripts,
      subagentTranscripts,
      loadingSubagents,
    });
  }
  if (activeSessionId === SWITCHBOARD_ID) {
    const turn = switchboardTurns.find((entry) => entry.id === selection.turnId);
    if (!turn) return null;
    const session = openSessions.find((entry) => entry.id === turn.sessionId);
    return {
      turn,
      subagent: null,
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
    subagent: null,
    sessionId: activeSession.id,
    session: activeSession,
    agent: activeSession.agent,
    cwd: activeSession.cwd,
    focusEventId: selection.focusEventId,
    focusKey: selection.focusKey,
  };
}
