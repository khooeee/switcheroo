import { test, expect } from "vitest";
import { PassThrough } from "node:stream";
import { controlCatalogJson, controlOpenApi } from "../src/main/control/controlCatalog";
import { bearerAuthorized } from "../src/main/control/controlAuth";
import { controlBootstrapText } from "../src/main/acp/controlBootstrapPrompt";
import { applyTranscriptQuery } from "../src/main/control/transcriptQuery";
import { handleControlRequest } from "../src/main/control/controlRoutes";
import type { SessionManager } from "../src/main/sessions";

test("catalog includes core session routes without blocking wait", () => {
  const catalog = controlCatalogJson("http://127.0.0.1:9/", "hint");
  expect(catalog.baseUrl).toBe("http://127.0.0.1:9/");
  expect(catalog.routes.some((r) => r.method === "POST" && r.path === "/sessions")).toBe(true);
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/prompt")).toBe(true);
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/rename" && r.body?.title)).toBe(true);
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/pin")).toBe(true);
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/unpin")).toBe(true);
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/transcript" && r.query?.last)).toBe(
    true,
  );
  expect(catalog.routes.some((r) => r.path === "/sessions/:id/wait")).toBe(false);
  expect(catalog.routes.some((r) => r.method === "DELETE")).toBe(false);
  const prompt = catalog.routes.find((r) => r.path === "/sessions/:id/prompt")!;
  expect(prompt.query).toBeUndefined();
  expect(prompt.example).not.toMatch(/wait=1/);
});

test("openapi omits root catalog paths", () => {
  const doc = controlOpenApi("http://127.0.0.1:9/");
  expect(doc.openapi).toBe("3.0.3");
  expect(doc.paths["/sessions"]).toBeTruthy();
  expect(doc.paths["/"]).toBeUndefined();
  expect(doc.paths["/sessions/{id}/wait"]).toBeUndefined();
});

test("bearerAuthorized accepts matching token", () => {
  expect(bearerAuthorized("Bearer secret", "secret")).toBe(true);
  expect(bearerAuthorized("Bearer nope", "secret")).toBe(false);
  expect(bearerAuthorized(undefined, "secret")).toBe(false);
});

test("bootstrap text teaches fire-and-poll", () => {
  const text = controlBootstrapText();
  expect(text).toMatch(/~\/\.switcheroo\/control\.json/);
  expect(text).toMatch(/GET \//);
  expect(text).toMatch(/turnId/);
  expect(text).toMatch(/transcript\?last=1/);
  expect(text).toMatch(/GET \/sessions/);
  expect(text).not.toMatch(/wait=1/);
  expect(text).not.toMatch(/Bearer [a-f0-9]{20,}/);
});

test("applyTranscriptQuery supports last=N", () => {
  const turns = [{ id: "a" }, { id: "b" }, { id: "c" }];
  expect(applyTranscriptQuery(turns, new URLSearchParams()).length).toBe(3);
  expect(applyTranscriptQuery(turns, new URLSearchParams("last=1")).map((t) => t.id)).toEqual([
    "c",
  ]);
  expect(applyTranscriptQuery(turns, new URLSearchParams("last=2")).map((t) => t.id)).toEqual([
    "b",
    "c",
  ]);
  expect(applyTranscriptQuery(turns, new URLSearchParams("last=0"))).toEqual([]);
  expect(applyTranscriptQuery(turns, new URLSearchParams("last=nope")).length).toBe(3);
});

function fakeReqRes(method: string, url: string) {
  const req = new PassThrough() as PassThrough & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  Object.assign(req, {
    method,
    url,
    headers: { authorization: "Bearer secret" },
  });
  let status = 0;
  let body = "";
  const res = {
    writeHead: (code: number) => {
      status = code;
    },
    end: (payload?: string) => {
      body = payload ?? "";
    },
  };
  return {
    req,
    res: res as unknown as Parameters<typeof handleControlRequest>[1],
    get status() {
      return status;
    },
    get body() {
      return body;
    },
  };
}

test("POST /sessions creates the session without switching focus to it", async () => {
  const calls: Array<{ input: unknown; options: unknown }> = [];
  const sessions = {
    createSession: async (input: unknown, options: unknown) => {
      calls.push({ input, options });
      return { id: "child-1" };
    },
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end(JSON.stringify({ agent: "claude", cwd: "/tmp", switcherooAware: true }));
  await done;
  expect(http.status).toBe(200);
  expect(JSON.parse(http.body).id).toBe("child-1");
  expect(calls.length).toBe(1);
  expect((calls[0].options as { focus: boolean }).focus).toBe(false);
  expect((calls[0].input as { switcherooAware: boolean }).switcherooAware).toBe(true);
});

test("POST /sessions/:id/rename renames an open session", async () => {
  const renamed: Array<{ id: string; title: string }> = [];
  const sessions = {
    getSession: (id: string) => (id === "child-1" ? { id: "child-1" } : undefined),
    renameSession: (id: string, title: string) => {
      renamed.push({ id, title });
    },
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions/child-1/rename");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end(JSON.stringify({ title: "  Renamed  " }));
  await done;
  expect(http.status).toBe(200);
  expect(JSON.parse(http.body)).toEqual({ sessionId: "child-1", title: "Renamed", ok: true });
  expect(renamed).toEqual([{ id: "child-1", title: "Renamed" }]);
});

test("POST /sessions/:id/rename requires a non-empty title", async () => {
  const sessions = {
    getSession: () => ({ id: "child-1" }),
    renameSession: () => {
      throw new Error("should not rename");
    },
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions/child-1/rename");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end(JSON.stringify({ title: "   " }));
  await done;
  expect(http.status).toBe(400);
  expect(JSON.parse(http.body).error).toBe("title is required");
});

test("POST /sessions/:id/pin pins an open session", async () => {
  const pinned: string[] = [];
  const sessions = {
    getSession: (id: string) => (id === "child-1" ? { id: "child-1" } : undefined),
    pinSession: (id: string) => {
      pinned.push(id);
      return true;
    },
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions/child-1/pin");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end();
  await done;
  expect(http.status).toBe(200);
  expect(JSON.parse(http.body)).toEqual({ sessionId: "child-1", pinned: true, ok: true });
  expect(pinned).toEqual(["child-1"]);
});

test("POST /sessions/:id/pin returns 400 when pin cap reached", async () => {
  const sessions = {
    getSession: () => ({ id: "child-1" }),
    pinSession: () => false,
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions/child-1/pin");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end();
  await done;
  expect(http.status).toBe(400);
  expect(JSON.parse(http.body).error).toBe("pinned session limit reached");
});

test("POST /sessions/:id/unpin unpins an open session", async () => {
  const unpinned: string[] = [];
  const sessions = {
    getSession: (id: string) => (id === "child-1" ? { id: "child-1" } : undefined),
    unpinSession: (id: string) => {
      unpinned.push(id);
    },
  } as unknown as SessionManager;
  const http = fakeReqRes("POST", "/sessions/child-1/unpin");
  const done = handleControlRequest(http.req as never, http.res, "secret", "http://127.0.0.1:1/", sessions);
  http.req.end();
  await done;
  expect(http.status).toBe(200);
  expect(JSON.parse(http.body)).toEqual({ sessionId: "child-1", pinned: false, ok: true });
  expect(unpinned).toEqual(["child-1"]);
});
