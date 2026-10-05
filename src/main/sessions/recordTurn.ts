import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionState } from "./SessionState";

/** Upsert a streamed turn into the transcript, notify the renderer and append to Switchboard. */
export function recordTurn(state: SessionState, sessionId: string, turn: TranscriptTurn): void {
  const session = state.sessions.get(sessionId);
  if (!session) return;
  const list = state.transcripts.get(sessionId) ?? [];
  const idx = list.findIndex((entry) => entry.id === turn.id);
  if (idx >= 0) list[idx] = turn;
  else list.push(turn);
  state.transcripts.set(sessionId, list);
  state.send("transcript", { sessionId, turn });
  state.bus.append({
    ...turn,
    sessionId,
    sessionTitle: session.title,
    agent: session.agent,
    navigable: true,
  });
}
