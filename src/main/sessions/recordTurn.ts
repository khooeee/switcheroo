import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionState } from "./SessionState";

/** Upsert a streamed turn into the transcript and notify the renderer. */
export function recordTurn(state: SessionState, sessionId: string, turn: TranscriptTurn): void {
  if (!state.sessions.has(sessionId)) return;
  const list = state.transcripts.get(sessionId) ?? [];
  const idx = list.findIndex((entry) => entry.id === turn.id);
  if (idx >= 0) list[idx] = turn;
  else list.push(turn);
  state.transcripts.set(sessionId, list);
  state.send("transcript", { sessionId, turn });
}
