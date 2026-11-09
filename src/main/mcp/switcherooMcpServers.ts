import type * as acp from "@agentclientprotocol/sdk/unstable";
import { liveControlEndpoint } from "../control/liveControlEndpoint";
import { mcpSessionKeys } from "./mcpSessionKeys";

/** Switcheroo's own MCP server for a session, served by the control server; none while it is down. */
export async function switcherooMcpServers(sessionId: string): Promise<acp.McpServer[]> {
  const endpoint = await liveControlEndpoint.get();
  if (!endpoint) return [];
  return [{
    type: "http",
    name: "switcheroo",
    url: `${endpoint.spec}mcp/${encodeURIComponent(sessionId)}`,
    headers: [{ name: "Authorization", value: `Bearer ${mcpSessionKeys.keyFor(sessionId)}` }],
  }];
}
