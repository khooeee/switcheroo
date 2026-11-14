import { agentTurns } from "../../shared/agentTurns";
import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionManager } from "../sessions/SessionManager";

/** Under the 60 s MCP tool timeout Codex and Pi apply by default. */
const MAX_WAIT_MS = 45_000;

async function busy(sessions: SessionManager, sessionId: string): Promise<boolean> {
  const session = sessions.getSession(sessionId);
  if (!session) return false;
  if (session.status === "connecting" || session.status === "running") return true;
  // A just-accepted prompt opens its turn before the session reports running.
  return (await sessions.getTranscript(sessionId)).some((turn) => turn.status === "running");
}

async function anyBusy(sessions: SessionManager, sessionIds: string[]): Promise<boolean> {
  return (await Promise.all(sessionIds.map((id) => busy(sessions, id)))).some(Boolean);
}

/** Streaming chunks are most events and cannot end a wait; anything else is worth a re-check. */
function mayEndWait(channel: string, payload: unknown): boolean {
  if (channel === "subagent:turn") return false;
  if (channel === "transcript") return (payload as { turn: TranscriptTurn }).turn.status !== "running";
  return true;
}

async function report(sessions: SessionManager, sessionId: string) {
  const session = sessions.getSession(sessionId);
  if (!session) return { sessionId, status: "not found" };
  if (await busy(sessions, sessionId)) return { sessionId, status: "running" };
  const last = agentTurns(await sessions.getTranscript(sessionId)).at(-1);
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
  const done = AbortSignal.any([signal, AbortSignal.timeout(waitMs)]);
  let changed = () => {};
  done.addEventListener("abort", () => changed(), { once: true });
  const unsubscribe = sessions.subscribe((channel, payload) => {
    if (mayEndWait(channel, payload)) changed();
  });
  try {
    while (!done.aborted) {
      // Arm before checking, so a change during the check is not missed.
      const next = new Promise<void>((resolve) => (changed = resolve));
      if (!(await anyBusy(sessions, sessionIds))) break;
      await next;
    }
  } finally {
    unsubscribe();
  }
  return Promise.all(sessionIds.map((id) => report(sessions, id)));
}
