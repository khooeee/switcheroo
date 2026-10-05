import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../sessions/SessionManager";
import { bearerAuthorized } from "./bearerAuthorized";
import { controlCatalogJson } from "./controlCatalogJson";
import { controlOpenApi } from "./controlOpenApi";
import { applyTranscriptQuery } from "./transcriptQuery";
import { parseCreateSession } from "./parseCreateSession";
import { readJson } from "./readJson";
import { sendJson } from "./sendJson";

/** Route one control API HTTP request to SessionManager. */
export async function handleControlRequest(
  req: IncomingMessage,
  res: ServerResponse,
  token: string,
  baseUrl: string,
  sessions: SessionManager,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", baseUrl);
    const method = (req.method ?? "GET").toUpperCase();
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    if (method === "GET" && pathname === "/") {
      return sendJson(res, 200, controlCatalogJson(baseUrl, "Use token from control.json; never commit it."));
    }
    if (method === "GET" && pathname === "/openapi.json") {
      return sendJson(res, 200, controlOpenApi(baseUrl));
    }

    if (!bearerAuthorized(req.headers.authorization, token)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    if (method === "GET" && pathname === "/sessions") {
      return sendJson(res, 200, sessions.list());
    }

    if (method === "POST" && pathname === "/sessions") {
      const body = await readJson(req);
      const input = parseCreateSession(body);
      // Agents create children in the background; keep the user's current view.
      const session = await sessions.createSession(input, { focus: false });
      return sendJson(res, 200, session);
    }

    const sessionMatch =
      /^\/sessions\/([^/]+)(?:\/(prompt|cancel|close|transcript|rename|pin|unpin))?$/.exec(pathname);
    if (!sessionMatch) return sendJson(res, 404, { error: "Not found" });
    const sessionId = decodeURIComponent(sessionMatch[1]!);
    const action = sessionMatch[2];

    if (method === "GET" && action === "transcript") {
      const turns = await sessions.getTranscript(sessionId);
      return sendJson(res, 200, { sessionId, turns: applyTranscriptQuery(turns, url.searchParams) });
    }
    if (method === "POST" && action === "prompt") {
      const body = await readJson(req);
      const text = typeof body.text === "string" ? body.text : "";
      if (!text.trim()) return sendJson(res, 400, { error: "text is required" });
      const turnId = await sessions.enqueuePrompt(sessionId, text);
      return sendJson(res, 200, { sessionId, turnId, ok: true });
    }
    if (method === "POST" && action === "rename") {
      const body = await readJson(req);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return sendJson(res, 400, { error: "title is required" });
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      sessions.renameSession(sessionId, title);
      return sendJson(res, 200, { sessionId, title, ok: true });
    }
    if (method === "POST" && action === "pin") {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      if (!sessions.pinSession(sessionId)) {
        return sendJson(res, 400, { error: "pinned session limit reached" });
      }
      return sendJson(res, 200, { sessionId, pinned: true, ok: true });
    }
    if (method === "POST" && action === "unpin") {
      if (!sessions.getSession(sessionId)) return sendJson(res, 404, { error: "Session not found" });
      sessions.unpinSession(sessionId);
      return sendJson(res, 200, { sessionId, pinned: false, ok: true });
    }
    if (method === "POST" && action === "cancel") {
      await sessions.cancelPrompt(sessionId);
      return sendJson(res, 200, { sessionId, ok: true });
    }
    if (method === "POST" && action === "close") {
      await sessions.closeSession(sessionId);
      return sendJson(res, 200, { sessionId, ok: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /not found|no session/i.test(msg) ? 404 : 400;
    return sendJson(res, status, { error: msg });
  }
}
