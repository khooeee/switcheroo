import * as path from "node:path";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import { controlBootstrapText } from "../../shared/controlBootstrapText";
import { newSessionId } from "../newSessionId";
import type { SessionDeps } from "./SessionDeps";
import { setSessionStatus } from "./setSessionStatus";

/** Add a new session to the rail and connect it, preferring a warm agent. */
export async function createSession(
  { state, persistence, agents }: SessionDeps,
  input: CreateSessionInput,
  focus: boolean,
): Promise<Session> {
  const id = newSessionId();
  const title = input.title ?? `${AGENT_LABELS[input.agent]} · ${path.basename(input.cwd)}`;
  const session: Session = {
    id,
    title,
    agent: input.agent,
    cwd: input.cwd,
    agentSessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
    tabs: [],
    tabsExpanded: true,
  };
  state.prependSession(session, input.pin === true);
  state.transcripts.set(id, []);
  state.hydrated.add(id);
  if (focus) state.activeTabId = id;
  state.emitSessions();

  try {
    const claimed = await state.warm.claim(input.agent, input.cwd);
    const acp = claimed ?? agents.openSession(session);
    state.agents.set(id, acp);
    if (claimed) {
      claimed.adopt(id, agents.callbacksFor(session));
      session.agentSessionId = claimed.sessionId;
      setSessionStatus(state, id, "ready", null);
    } else {
      await acp.start();
      session.agentSessionId = acp.sessionId;
      state.emitSessions();
    }
    if (input.switcherooAware) {
      // Don't hold the caller for the whole bootstrap turn; prompts sent
      // meanwhile queue behind it as their own turns instead of steering in.
      await acp.prompt(controlBootstrapText(id), { wait: false, exclusive: true });
    }
  } catch (err) {
    setSessionStatus(state, id, "error", errorMessage(err));
  }

  agents.ensureWarm(input.cwd);
  void persistence.persist();
  return session;
}
