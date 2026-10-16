import * as acp from "@agentclientprotocol/sdk";
import { airSessionMeta } from "./airSessionMeta";

/** `session/resume` on this connection, carrying the session's instructions. */
export async function resumeAcpSession(
  connection: acp.ClientConnection,
  sessionId: string,
  cwd: string,
  instructions: string | null,
): Promise<void> {
  await connection.agent.request(acp.methods.agent.session.resume, {
    sessionId,
    cwd,
    mcpServers: [],
    ...airSessionMeta(instructions),
  });
}
