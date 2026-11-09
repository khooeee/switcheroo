import type { SessionManager } from "../sessions/SessionManager";

/** Under the 60 s MCP tool timeout Codex and Pi apply by default. */
const MAX_WAIT_MS = 45_000;
const POLL_MS = 500;

async function busy(sessions: SessionManager, sessionId: string): Promise<boolean> {
  const session = sessions.getSession(sessionId);
  if (!session) return false;
  if (session.status === "connecting" || session.status === "running") return true;
  // A just-accepted prompt opens its turn before the session reports running.
  return (await sessions.getTranscript(sessionId)).some((turn) => turn.status === "running");
}

async function report(sessions: SessionManager, sessionId: string) {
  const session = sessions.getSession(sessionId);
  if (!session) return { sessionId, status: "not found" };
  if (await busy(sessions, sessionId)) return { sessionId, status: "running" };
  const last = (await sessions.getTranscript(sessionId)).at(-1);
  return {
    sessionId,
    status: session.status,
    ...(session.error ? { error: session.error } : {}),
    reply: last?.assistant?.text ?? null,
  };
}

/** Wait until none of the sessions is busy, the time is up, or the caller gives up; report each one. */
export async function waitForSessions(
  sessions: SessionManager,
  sessionIds: string[],
  timeoutSeconds: number | undefined,
  signal: AbortSignal,
) {
  const waitMs = Math.min(MAX_WAIT_MS, Math.max(0, (timeoutSeconds ?? Infinity) * 1000));
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline && !signal.aborted) {
    const states = await Promise.all(sessionIds.map((id) => busy(sessions, id)));
    if (!states.some(Boolean)) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return Promise.all(sessionIds.map((id) => report(sessions, id)));
}
