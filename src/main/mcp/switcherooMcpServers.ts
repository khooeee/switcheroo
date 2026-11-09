import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { Session } from "../../shared/session";
import { liveControlEndpoint } from "../control/liveControlEndpoint";
import { mcpSessionKeys } from "./mcpSessionKeys";

/** Switcheroo's own MCP server, served by the control server, for an aware session; none otherwise. */
export async function switcherooMcpServers(
  session: Pick<Session, "id" | "switcherooAware">,
): Promise<acp.McpServer[]> {
  if (!session.switcherooAware) return [];
  const endpoint = await liveControlEndpoint.get();
  if (!endpoint) return [];
  return [{
    type: "http",
    name: "switcheroo",
    url: `${endpoint.spec}mcp/${encodeURIComponent(session.id)}`,
    headers: [{ name: "Authorization", value: `Bearer ${mcpSessionKeys.keyFor(session.id)}` }],
  }];
}
