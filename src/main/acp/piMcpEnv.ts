import { existsSync } from "node:fs";
import { join } from "node:path";
import type * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";

/** `assets/pi-mcp` in a dev checkout, or the packaged extraResource. */
function piMcpDir(): string {
  const roots = [join(process.cwd(), "assets")];
  if (typeof process.resourcesPath === "string") roots.unshift(process.resourcesPath);
  const dirs = roots.map((root) => join(root, "pi-mcp"));
  return dirs.find((dir) => existsSync(dir)) ?? dirs.at(-1)!;
}

/**
 * pi-acp accepts `mcpServers` but never hands them to Pi, so run Pi through a wrapper that loads an
 * extension registering them from `PI_ACP_MCP_SERVERS`. Each Pi session has its own pi-acp process.
 * See docs/pi-mcp-servers.md.
 */
export function piMcpEnv(agent: AgentKind, mcpServers: acp.McpServer[]): Record<string, string> {
  if (agent !== "pi" || mcpServers.length === 0) return {};
  return {
    PI_ACP_PI_COMMAND: join(piMcpDir(), "pi-with-mcp.sh"),
    // The wrapper still runs the user's own Pi command.
    SWITCHEROO_PI_COMMAND: process.env.PI_ACP_PI_COMMAND || "pi",
    PI_ACP_MCP_SERVERS: JSON.stringify(mcpServers),
  };
}
