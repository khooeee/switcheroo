import type { IncomingMessage, ServerResponse } from "node:http";
import { errorMessage } from "../../shared/errorMessage";
import type { SessionManager } from "../sessions/SessionManager";
import { readJson } from "../control/readJson";
import { sendJson } from "../control/sendJson";
import { callSwitcherooTool } from "./callSwitcherooTool";
import { mcpSessionKeys } from "./mcpSessionKeys";
import { SWITCHEROO_TOOLS } from "./switcherooTools";

const INSTRUCTIONS = [
  "Switcheroo is the desktop app running this session; its sidebar lists other agent sessions (Claude Code, Codex, Cursor, Pi).",
  "Use these tools to start sessions, prompt them and collect their replies, for example to work on several tasks in parallel.",
  "Do not block on children: send prompts, keep working, then collect replies with wait_for_sessions.",
  "Close the sessions you create once you are done with them.",
].join(" ");

type RpcId = string | number;

function rpcResult(id: RpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: RpcId | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function answer(
  sessions: SessionManager,
  callerId: string,
  id: RpcId,
  method: unknown,
  params: Record<string, unknown>,
  signal: AbortSignal,
) {
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        // Echo the client's version: nothing here differs between protocol versions.
        protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "switcheroo", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: SWITCHEROO_TOOLS });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = params.arguments && typeof params.arguments === "object" ? params.arguments as Record<string, unknown> : {};
      return rpcResult(id, await callSwitcherooTool(sessions, callerId, name, args, signal));
    }
    default:
      return rpcError(id, -32601, `Method not found: ${String(method)}`);
  }
}

/**
 * Streamable HTTP MCP endpoint for one session (`POST /mcp/:sessionId`). Replies are plain JSON;
 * there is no server-sent stream, so GET is refused and notifications are only acknowledged.
 */
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  sessions: SessionManager,
): Promise<void> {
  if (!mcpSessionKeys.matches(sessionId, req.headers.authorization)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" }).end();
    return;
  }
  let message: Record<string, unknown>;
  try {
    message = await readJson(req);
  } catch (error) {
    return sendJson(res, 400, rpcError(null, -32700, `Parse error: ${errorMessage(error)}`));
  }
  const id = message.id;
  if (typeof id !== "string" && typeof id !== "number") {
    res.writeHead(202).end();
    return;
  }
  // A cancelled tool call closes the request; stop waiting on its behalf.
  const aborted = new AbortController();
  res.on("close", () => aborted.abort());
  const params = message.params && typeof message.params === "object" ? message.params as Record<string, unknown> : {};
  const reply = await answer(sessions, sessionId, id, message.method, params, aborted.signal);
  if (!res.destroyed) sendJson(res, 200, reply);
}
