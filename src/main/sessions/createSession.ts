import * as path from "node:path";
import type { CreateSessionInput } from "../../shared/createSessionInput";
import type { Session } from "../../shared/session";
import { agentLabel } from "../acp/presets";
import { controlBootstrapText } from "../acp/controlBootstrapPrompt";
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
  const title =
    input.title ??
    `${agentLabel(input.agent)} · ${path.basename(input.cwd)}`;
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
    if (claimed) {
      claimed.adopt(id, agents.callbacksFor(session));
      state.agents.set(id, claimed);
      session.agentSessionId = claimed.sessionId;
      setSessionStatus(state, id, "ready", null);
      if (input.switcherooAware) {
        await claimed.prompt(controlBootstrapText());
      }
    } else {
      const acp = agents.openSession(session);
      state.agents.set(id, acp);
      await acp.start();
      session.agentSessionId = acp.sessionId;
      state.emitSessions();
      if (input.switcherooAware) {
        await acp.prompt(controlBootstrapText());
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setSessionStatus(state, id, "error", msg);
  }

  agents.ensureWarm(input.agent, input.cwd);
  void persistence.persist();
  return session;
}
