import { randomUUID } from "node:crypto";
import type { TranscriptTurn } from "../../shared/transcript";
import { recordTurn } from "./recordTurn";
import type { SessionDeps } from "./SessionDeps";

/** Record a due reminder in the session's transcript as its own turn; the agent never sees it. */
export async function noteReminder(
  { state, hydration, persistence }: SessionDeps,
  sessionId: string,
  message: string,
): Promise<void> {
  if (!state.sessions.has(sessionId) || !(await hydration.ensure(sessionId))) return;
  const at = Date.now();
  const turn: TranscriptTurn = {
    id: randomUUID(),
    at,
    user: { id: randomUUID(), role: "reminder", text: message, at },
    assistant: null,
    events: [],
    fileChanges: [],
    status: "complete",
  };
  recordTurn(state, sessionId, turn);
  persistence.queuePersist();
}
