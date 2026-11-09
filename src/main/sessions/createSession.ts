import { AGENT_LABELS } from "../../shared/agentLabels";
import { clipText } from "../../shared/clipText";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import { errorMessage } from "../../shared/errorMessage";
import { folderTitle } from "../../shared/folderTitle";
import type { Session } from "../../shared/session";
import { newSessionId } from "./newSessionId";
import type { SessionDeps } from "./SessionDeps";
import { setSessionStatus } from "./setSessionStatus";

/** Add a new session to the rail and connect it, preferring a warm agent. */
export async function createSession(
  { state, persistence, agents }: SessionDeps,
  input: CreateSessionInput,
  focus: boolean,
): Promise<Session> {
  const warm = state.warm.take(input.agent, input.cwd);
  const id = warm?.acp.id ?? newSessionId();
  const title = input.title
    ?? folderTitle(input.cwd, input.prompt ? clipText(input.prompt, 60) : AGENT_LABELS[input.agent]);
  const session: Session = {
    id,
    title,
    agent: input.agent,
    cwd: input.cwd,
    agentSessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
    cron: input.cron || undefined,
    autoTitle: input.autoTitle || undefined,
  };
  state.prependSession(session, input.pin === true);
  state.transcripts.set(id, []);
  state.hydrated.add(id);
  if (focus) state.activeTabId = id;
  state.emitSessions();

  try {
    const claimed = warm && (await warm.started) ? warm.acp : null;
    const acp = claimed ?? agents.openSession(session);
    state.agents.set(id, acp);
    if (claimed) {
      claimed.adopt(agents.callbacksFor(session));
      session.agentSessionId = claimed.sessionId;
      setSessionStatus(state, id, "ready", null);
    } else {
      await acp.start();
      session.agentSessionId = acp.sessionId;
      state.emitSessions();
    }
  } catch (err) {
    setSessionStatus(state, id, "error", errorMessage(err));
  }

  agents.ensureWarm(input.cwd);
  void persistence.persist();
  return session;
}
