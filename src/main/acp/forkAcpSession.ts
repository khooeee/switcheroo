import * as acp from "@agentclientprotocol/sdk";

type AgentConnection = {
  agent: {
    request: (
      method: typeof acp.methods.agent.session.fork,
      params: acp.ForkSessionRequest,
    ) => Promise<acp.ForkSessionResponse>;
  };
};

/** Fork the live ACP session; optional message id truncates history when the agent supports it. */
export async function forkAcpSession(
  connection: AgentConnection,
  sessionId: string,
  cwd: string,
  atMessageId?: string,
): Promise<string> {
  const response = await connection.agent.request(acp.methods.agent.session.fork, {
    sessionId,
    cwd,
    mcpServers: [],
    ...(atMessageId
      ? { _meta: { claudeCode: { rewindTo: atMessageId } } }
      : {}),
  });
  if (!response.sessionId) throw new Error("Agent did not return a forked session id");
  return response.sessionId;
}
