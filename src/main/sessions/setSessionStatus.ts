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
  const newError = status === "error" && session.status !== "error";
  session.status = status;
  session.error = error;
  state.emitSessions();
  if (newError) state.observer?.sessionError(sessionId, error ?? "Unknown error");
}
