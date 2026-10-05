import { formatAgentError } from "../../shared/formatAgentError";
import type { SessionDeps } from "./SessionDeps";

/** Send a prompt and return its turn id; `wait` blocks until the turn finishes. */
export async function promptSession(
  { state, persistence, hydration, agents }: SessionDeps,
  sessionId: string,
  text: string,
  wait: boolean,
): Promise<string> {
  const session = await hydration.ensure(sessionId);
  if (!session) throw new Error("No session");
  state.bumpSession(session.id);
  state.emitSessions();
  const acp = await agents.ensureSession(session);
  try {
    const turnId = await acp.prompt(text, { wait });
    if (session.agentSessionId !== acp.sessionId) {
      session.agentSessionId = acp.sessionId;
      state.emitSessions();
    }
    return turnId;
  } catch (error) {
    throw new Error(formatAgentError(error));
  } finally {
    await persistence.persist();
  }
}
