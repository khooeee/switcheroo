import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import type { RightRailSelection } from "./nextRightRailSelection";
import type { RightRailView } from "./RightRailView";
import { resolveSubagentRailView } from "../subagents/resolveSubagentRailView";

/** Find the selected turn (or subagent) in the active session. */
export function resolveRightRailView({
  selection,
  activeSession,
  transcripts,
  subagentTranscripts,
  loadingSubagents,
}: {
  selection: RightRailSelection | null;
  activeSession: Session | null;
  transcripts: Record<string, TranscriptTurn[]>;
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}): RightRailView | null {
  if (!selection || !activeSession) return null;
  if (selection.subagentId) {
    return resolveSubagentRailView({
      selection,
      subagentId: selection.subagentId,
      session: activeSession,
      transcripts,
      subagentTranscripts,
      loadingSubagents,
    });
  }
  const turn = (transcripts[activeSession.id] ?? []).find(
    (entry) => entry.id === selection.turnId,
  );
  if (!turn) return null;
  return {
    turn,
    subagent: null,
    session: activeSession,
    focusEventId: selection.focusEventId,
    focusKey: selection.focusKey,
  };
}
