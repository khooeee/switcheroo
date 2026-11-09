import * as acp from "@agentclientprotocol/sdk/unstable";
import type { AirForkPoint } from "./airForkPoint";
import { airSessionMeta } from "./airSessionMeta";

type AgentConnection = {
  agent: {
    request: (
      method: typeof acp.methods.agent.session.fork,
      params: acp.ForkSessionRequest,
    ) => Promise<acp.ForkSessionResponse>;
  };
};

/** Fork the live ACP session; a fork point drops agent history after that message. */
export async function forkAcpSession(
  connection: AgentConnection,
  sessionId: string,
  cwd: string,
  forkPoint: AirForkPoint | undefined,
  /** The fork's own MCP servers (it has a new Switcheroo session id). */
  mcpServers: acp.McpServer[],
): Promise<acp.ForkSessionResponse> {
  const response = await connection.agent.request(acp.methods.agent.session.fork, {
    sessionId,
    cwd,
    mcpServers,
    ...airSessionMeta(forkPoint),
  });
  if (!response.sessionId) throw new Error("Agent did not return a forked session id");
  return response;
}
