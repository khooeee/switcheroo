import type { SessionState } from "./SessionState";

export function removeTurn(state: SessionState, sessionId: string, turnId: string): void {
  if (!state.sessions.has(sessionId)) return;
  const list = (state.transcripts.get(sessionId) ?? []).filter((turn) => turn.id !== turnId);
  state.transcripts.set(sessionId, list);
  state.pushTranscript(sessionId);
}
