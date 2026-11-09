import * as acp from "@agentclientprotocol/sdk/unstable";

/** `session/resume` on this connection, carrying the session's MCP servers. */
export async function resumeAcpSession(
  connection: acp.ClientConnection,
  sessionId: string,
  cwd: string,
  mcpServers: acp.McpServer[],
): Promise<acp.ResumeSessionResponse> {
  return connection.agent.request(acp.methods.agent.session.resume, { sessionId, cwd, mcpServers });
}
