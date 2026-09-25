import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentKind, CreateTabInput } from "../../shared/types";
import type { TabManager } from "../tabs";
import { bearerAuthorized } from "./controlAuth";
import { controlCatalogJson, controlOpenApi } from "./controlCatalog";

const DEFAULT_WAIT_MS = 600_000;

export async function handleControlRequest(
  req: IncomingMessage,
  res: ServerResponse,
  token: string,
  baseUrl: string,
  tabs: TabManager,
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

    if (method === "GET" && pathname === "/tabs") {
      return json(res, 200, tabs.list());
    }

    if (method === "POST" && pathname === "/tabs") {
      const body = await readJson(req);
      const input = parseCreateTab(body);
      const tab = await tabs.createTab(input);
      return json(res, 200, tab);
    }

    const tabMatch = /^\/tabs\/([^/]+)(?:\/(prompt|cancel|close|transcript|wait))?$/.exec(pathname);
    if (!tabMatch) return json(res, 404, { error: "Not found" });
    const tabId = decodeURIComponent(tabMatch[1]!);
    const action = tabMatch[2];

    if (method === "GET" && action === "transcript") {
      return json(res, 200, { tabId, items: tabs.getTranscript(tabId) });
    }
    if (method === "GET" && action === "wait") {
      const timeout = Number(url.searchParams.get("timeout") ?? DEFAULT_WAIT_MS);
      const result = await tabs.waitUntilSettled(tabId, timeout);
      return json(res, 200, result);
    }
    if (method === "POST" && action === "prompt") {
      const body = await readJson(req);
      const text = typeof body.text === "string" ? body.text : "";
      if (!text.trim()) return json(res, 400, { error: "text is required" });
      const wait = url.searchParams.get("wait") === "1";
      const timeout = Number(url.searchParams.get("timeout") ?? DEFAULT_WAIT_MS);
      await tabs.sendPrompt(tabId, text);
      if (wait) {
        const settled = await tabs.waitUntilSettled(tabId, timeout);
        return json(res, 200, { ok: true, waited: true, ...settled });
      }
      return json(res, 200, { tabId, ok: true, waited: false });
    }
    if (method === "POST" && action === "cancel") {
      await tabs.cancelPrompt(tabId);
      return json(res, 200, { tabId, ok: true });
    }
    if (method === "POST" && action === "close") {
      await tabs.closeTab(tabId);
      return json(res, 200, { tabId, ok: true });
    }

    return json(res, 404, { error: "Not found" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /not found|no tab/i.test(msg) ? 404 : 400;
    return json(res, status, { error: msg });
  }
}

function parseCreateTab(body: Record<string, unknown>): CreateTabInput {
  const agentKind = body.agentKind;
  if (agentKind !== "claude" && agentKind !== "codex" && agentKind !== "cursor") {
    throw new Error("agentKind must be claude, codex, or cursor");
  }
  const cwd = body.cwd;
  if (typeof cwd !== "string" || !cwd.trim()) throw new Error("cwd is required");
  const title = typeof body.title === "string" ? body.title : undefined;
  const switcherooAware = body.switcherooAware === true;
  return { agentKind: agentKind as AgentKind, cwd, title, switcherooAware };
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
