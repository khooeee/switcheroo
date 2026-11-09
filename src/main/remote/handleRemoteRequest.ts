import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import { bearerAuthorized } from "../control/bearerAuthorized";
import { handleControlRequest } from "../control/controlRoutes";
import { sendJson } from "../control/sendJson";
import type { RemoteEventHub } from "./RemoteEventHub";

export type RemoteContext = {
  token: string;
  baseUrl: string;
  sessions: SessionManager;
  hub: RemoteEventHub;
};

/** Event streams here; everything else is the control API. */
export async function handleRemoteRequest(
  req: IncomingMessage,
  res: ServerResponse,
  { token, baseUrl, sessions, hub }: RemoteContext,
): Promise<void> {
  const url = new URL(req.url ?? "/", baseUrl);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
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
