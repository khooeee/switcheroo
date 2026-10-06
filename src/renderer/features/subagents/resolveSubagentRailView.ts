import type { ActiveSessionId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import type { RightRailSelection } from "../chat/nextRightRailSelection";
import type { RightRailView } from "../chat/RightRailView";
import { findSubagentRow } from "./findSubagentRow";
import { subagentKey } from "./subagentKey";

const NO_TURNS: TranscriptTurn[] = [];

/** Right-rail view for a subagent of the active chat, or of any open chat from Switchboard. */
export function resolveSubagentRailView({
  selection,
  subagentId,
  activeSessionId,
  activeSession,
  openSessions,
  transcripts,
  subagentTranscripts,
  loadingSubagents,
}: {
  selection: RightRailSelection;
  subagentId: string;
  activeSessionId: ActiveSessionId;
  activeSession: Session | null;
  openSessions: Session[];
  transcripts: Record<string, TranscriptTurn[]>;
  subagentTranscripts: Record<string, TranscriptTurn[]>;
  loadingSubagents: ReadonlySet<string>;
}): RightRailView | null {
  const session = activeSession?.id === selection.sessionId
    ? activeSession
    : activeSessionId === SWITCHBOARD_ID
      ? openSessions.find((entry) => entry.id === selection.sessionId)
      : undefined;
  if (!session) return null;
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
    sessionId: session.id,
    session,
    agent: session.agent,
    cwd: session.cwd,
    focusEventId: selection.focusEventId,
    focusKey: selection.focusKey,
  };
}
