import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionState } from "./SessionState";

/** Store a streamed subagent turn and push it to the renderer (subagents stay out of Switchboard). */
export function recordSubagentTurn(
  state: SessionState,
  sessionId: string,
  subagentId: string,
  turn: TranscriptTurn,
): void {
  state.subagentTranscripts.record(sessionId, subagentId, turn);
  state.send("subagent:turn", { sessionId, subagentId, turn });
}
