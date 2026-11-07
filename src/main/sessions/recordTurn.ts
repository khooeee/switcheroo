import type { TranscriptTurn } from "../../shared/transcript";
import { activityFromTurn } from "../activity/activityFromTurn";
import { appendActivity } from "../activity/appendActivity";
import type { SessionState } from "./SessionState";

/** Upsert a streamed turn into the transcript, notify the renderer and log it once finished. */
export function recordTurn(state: SessionState, sessionId: string, turn: TranscriptTurn): void {
  const session = state.sessions.get(sessionId);
  if (!session) return;
  const list = state.transcripts.get(sessionId) ?? [];
  const idx = list.findIndex((entry) => entry.id === turn.id);
  const finished = list[idx]?.status === "running" && turn.status !== "running";
  if (idx >= 0) list[idx] = turn;
  else list.push(turn);
  state.transcripts.set(sessionId, list);
  state.send("transcript", { sessionId, turn });
  if (finished) appendActivity(activityFromTurn(session, turn));
}
