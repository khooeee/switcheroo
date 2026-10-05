import type { SessionStatus } from "../../shared/session";
import type { SessionState } from "./SessionState";

export function setSessionStatus(
  state: SessionState,
  sessionId: string,
  status: SessionStatus,
  error: string | null,
): void {
  const session = state.sessions.get(sessionId);
  if (!session) return;
  session.status = status;
  session.error = error;
  state.send("session-status", { sessionId, status, error });
  state.emitSessions();
}
