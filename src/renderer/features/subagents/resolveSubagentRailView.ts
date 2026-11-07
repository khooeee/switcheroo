import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import type { RightRailSelection } from "../chat/nextRightRailSelection";
import type { RightRailView } from "../chat/RightRailView";
import { findSubagentRow } from "./findSubagentRow";
import { subagentKey } from "./subagentKey";

const NO_TURNS: TranscriptTurn[] = [];

/** Right-rail view for a subagent of the active chat. */
export function resolveSubagentRailView({
  selection,
  subagentId,
  session,
  transcripts,
  subagentTranscripts,
  loadingSubagents,
}: {
  selection: RightRailSelection;
  subagentId: string;
  session: Session;
  transcripts: Record<string, TranscriptTurn[]>;
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}): RightRailView {
  const key = subagentKey(session.id, subagentId);
  // A nested subagent's row lives in its parent subagent's transcript.
  const prefix = subagentKey(session.id, "");
  const loaded = Object.entries(subagentTranscripts)
    .filter(([entryKey]) => entryKey.startsWith(prefix))
    .map(([, turns]) => turns);
  const row = findSubagentRow(subagentId, [transcripts[session.id] ?? NO_TURNS, ...loaded]);
  return {
    turn: null,
    subagent: {
      id: subagentId,
      name: row?.text || "Subagent",
      task: row?.toolTitle,
      state: row?.toolStatus,
      turns: subagentTranscripts[key] ?? NO_TURNS,
      loading: loadingSubagents.has(key),
    },
    session,
    focusEventId: selection.focusEventId,
    focusKey: selection.focusKey,
  };
}
