import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import type { RemoteEventHub } from "../remote/RemoteEventHub";
import { handleMcpRequest } from "../mcp/handleMcpRequest";
import { allowedHost } from "./allowedHost";
import { handleControlRequest } from "./controlRoutes";
import { requestAuthorized } from "./requestAuthorized";
import { sendJson } from "./sendJson";
import { viaTailscaleServe } from "./viaTailscaleServe";

type ServerContext = {
  /** control.json scripts' token; refused over Tailscale. */
  localToken: string;
  /** The iOS app's token. */
  remoteToken: string;
  baseUrl: string;
  sessions: SessionManager;
  hub: RemoteEventHub;
  remoteEnabled: () => boolean;
};

/**
 * Refuse unexpected Host headers, Tailscale Funnel (the public internet), and Tailscale traffic unless remote
 * access is on; MCP and event streams here, everything else is the control API.
 */
export async function handleServerRequest(
  req: IncomingMessage,
  res: ServerResponse,
  { localToken, remoteToken, baseUrl, sessions, hub, remoteEnabled }: ServerContext,
): Promise<void> {
  if (!allowedHost(req.headers.host)) {
    return sendJson(res, 403, { error: "Unexpected Host header" });
  }
  // Serve sets this on Funnel traffic and strips any copy a client sends.
  if (req.headers["tailscale-funnel-request"]) {
    return sendJson(res, 403, { error: "Switcheroo refuses Tailscale Funnel. Use tailscale serve, which keeps it on your tailnet." });
  }
  if (!remoteEnabled() && viaTailscaleServe(req)) {
    return sendJson(res, 403, { error: "Remote access is off. Tick Allow the iOS app over Tailscale in Switcheroo's Settings." });
  }
  const url = new URL(req.url ?? "/", baseUrl);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const mcpMatch = /^\/mcp\/([^/]+)$/.exec(pathname);
  if (mcpMatch) return handleMcpRequest(req, res, decodeURIComponent(mcpMatch[1]!), sessions);
  const authorized = requestAuthorized(req, localToken, remoteToken);
  const streamMatch = req.method === "GET" ? /^\/(?:sessions\/([^/]+)\/)?events$/.exec(pathname) : null;
  if (!streamMatch) return handleControlRequest(req, res, authorized, baseUrl, sessions);

  if (!authorized) return sendJson(res, 401, { error: "Unauthorized" });
  const sessionId = streamMatch[1] && decodeURIComponent(streamMatch[1]);
  if (!sessionId) return hub.openList(req, res);
  if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
  return hub.openTranscript(sessionId, req, res);
}
