import type * as acp from "@agentclientprotocol/sdk/unstable";

/** A session's MCP servers, resolved on every new/load/resume/fork so they follow the control server. */
export type McpServersSource = () => Promise<acp.McpServer[]>;
