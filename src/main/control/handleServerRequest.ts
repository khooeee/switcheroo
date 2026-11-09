import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import type { RemoteEventHub } from "../remote/RemoteEventHub";
import { handleMcpRequest } from "../mcp/handleMcpRequest";
import { bearerAuthorized } from "./bearerAuthorized";
import { handleControlRequest } from "./controlRoutes";
import { sendJson } from "./sendJson";
import { viaTailscaleServe } from "./viaTailscaleServe";

export type ServerContext = {
  token: string;
  baseUrl: string;
  sessions: SessionManager;
  hub: RemoteEventHub;
  remoteEnabled: () => boolean;
};

/** Refuse Tailscale traffic unless remote access is on; MCP and event streams here, everything else is the control API. */
export async function handleServerRequest(
  req: IncomingMessage,
  res: ServerResponse,
  { token, baseUrl, sessions, hub, remoteEnabled }: ServerContext,
): Promise<void> {
  if (!remoteEnabled() && viaTailscaleServe(req)) {
    return sendJson(res, 403, { error: "Remote access is off. Tick Allow the iOS app over Tailscale in Switcheroo's Settings." });
  }
  const url = new URL(req.url ?? "/", baseUrl);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const mcpMatch = /^\/mcp\/([^/]+)$/.exec(pathname);
  if (mcpMatch) return handleMcpRequest(req, res, decodeURIComponent(mcpMatch[1]!), sessions);
  const streamMatch = req.method === "GET" ? /^\/(?:sessions\/([^/]+)\/)?events$/.exec(pathname) : null;
  if (!streamMatch) return handleControlRequest(req, res, token, baseUrl, sessions);

  if (!bearerAuthorized(req.headers.authorization, token)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }
  const sessionId = streamMatch[1] && decodeURIComponent(streamMatch[1]);
  if (!sessionId) return hub.openList(req, res);
  if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
  return hub.openTranscript(sessionId, req, res);
}
