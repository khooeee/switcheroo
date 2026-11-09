import type { SessionDeps } from "./SessionDeps";

/**
 * Give a session Switcheroo's MCP tools. Agents take MCP servers only when a session starts or reopens,
 * so drop its agent connection and reopen the agent session with the server attached.
 */
export async function makeSessionAware({ state, persistence, agents }: SessionDeps, sessionId: string): Promise<void> {
  const session = state.sessions.get(sessionId);
  if (!session || session.switcherooAware) return;
  if (session.status === "running") throw new Error("Wait for the current turn to finish, then try again.");
  session.switcherooAware = true;
  state.emitSessions();
  void persistence.persist();
  const acp = state.agents.get(sessionId);
  state.agents.delete(sessionId);
  await acp?.dispose();
  await agents.ensureSession(session);
}
