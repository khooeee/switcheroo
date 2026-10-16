import * as path from "node:path";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import { errorMessage } from "../../shared/errorMessage";
import type { Session } from "../../shared/session";
import { controlBootstrapText } from "../../shared/controlBootstrapText";
import { newSessionId } from "../newSessionId";
import type { SessionDeps } from "./SessionDeps";
import { setSessionStatus } from "./setSessionStatus";
import { sessionInstructions } from "./sessionInstructions";
import { warmKey } from "./warmKey";

/** Add a new session to the rail and connect it, preferring a warm agent. */
export async function createSession(
  { state, persistence, agents }: SessionDeps,
  input: CreateSessionInput,
  focus: boolean,
): Promise<Session> {
  const warm = state.warm.take(warmKey(input.agent, input.switcherooAware === true), input.cwd);
  // Keep the warm session's id: an aware one's instructions already name it.
  const id = warm?.acp.id ?? newSessionId();
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
    switcherooAware: input.switcherooAware || undefined,
    tabs: [],
    tabsExpanded: true,
  };
  state.prependSession(session, input.pin === true);
  state.transcripts.set(id, []);
  state.hydrated.add(id);
  if (focus) state.activeTabId = id;
  state.emitSessions();

  try {
    const instructed = sessionInstructions(session) !== null;
    const claimed = warm && (await warm.started) ? warm.acp : null;
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
    if (input.switcherooAware && !instructed) {
      // Agents without session instructions get the control API as a first prompt.
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
