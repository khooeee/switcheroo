import type { IncomingMessage, ServerResponse } from "node:http";
import { isAgentKind, type CreateSessionInput } from "../../shared/types";
import type { SessionManager } from "../sessions";
import { bearerAuthorized } from "./controlAuth";
import { controlCatalogJson, controlOpenApi } from "./controlCatalog";

const DEFAULT_WAIT_MS = 600_000;

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
      return json(res, 200, controlCatalogJson(baseUrl, "Use token from control.json; never commit it."));
    }
    if (method === "GET" && pathname === "/openapi.json") {
      return json(res, 200, controlOpenApi(baseUrl));
    }

    if (!bearerAuthorized(req.headers.authorization, token)) {
      return json(res, 401, { error: "Unauthorized" });
    }

    if (method === "GET" && pathname === "/sessions") {
      return json(res, 200, sessions.list());
    }

    if (method === "POST" && pathname === "/sessions") {
      const body = await readJson(req);
      const input = parseCreateTab(body);
      const tab = await sessions.createSession(input);
      return json(res, 200, tab);
    }

    const sessionMatch = /^\/sessions\/([^/]+)(?:\/(prompt|cancel|close|transcript|wait))?$/.exec(pathname);
    if (!sessionMatch) return json(res, 404, { error: "Not found" });
    const sessionId = decodeURIComponent(sessionMatch[1]!);
    const action = sessionMatch[2];

    if (method === "GET" && action === "transcript") {
      return json(res, 200, { sessionId, items: await sessions.getTranscript(sessionId) });
    }
    if (method === "GET" && action === "wait") {
      const timeout = Number(url.searchParams.get("timeout") ?? DEFAULT_WAIT_MS);
      const result = await sessions.waitUntilSettled(sessionId, timeout);
      return json(res, 200, result);
    }
    if (method === "POST" && action === "prompt") {
      const body = await readJson(req);
      const text = typeof body.text === "string" ? body.text : "";
      if (!text.trim()) return json(res, 400, { error: "text is required" });
      const wait = url.searchParams.get("wait") === "1";
      const timeout = Number(url.searchParams.get("timeout") ?? DEFAULT_WAIT_MS);
      await sessions.sendPrompt(sessionId, text);
      if (wait) {
        const settled = await sessions.waitUntilSettled(sessionId, timeout);
        return json(res, 200, { ok: true, waited: true, ...settled });
      }
      return json(res, 200, { sessionId, ok: true, waited: false });
    }
    if (method === "POST" && action === "cancel") {
      await sessions.cancelPrompt(sessionId);
      return json(res, 200, { sessionId, ok: true });
    }
    if (method === "POST" && action === "close") {
      await sessions.closeSession(sessionId);
      return json(res, 200, { sessionId, ok: true });
    }

    return json(res, 404, { error: "Not found" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /not found|no session/i.test(msg) ? 404 : 400;
    return json(res, status, { error: msg });
  }
}

function parseCreateTab(body: Record<string, unknown>): CreateSessionInput {
  const agentKind = body.agentKind;
  if (!isAgentKind(agentKind)) {
    throw new Error("agentKind must be claude, codex, cursor, or pi");
  }
  const cwd = body.cwd;
  if (typeof cwd !== "string" || !cwd.trim()) throw new Error("cwd is required");
  const title = typeof body.title === "string" ? body.title : undefined;
  const switcherooAware = body.switcherooAware === true;
  return { agentKind, cwd, title, switcherooAware };
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("JSON object body required"));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}
