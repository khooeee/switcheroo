const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require, Buffer, console });
  return exports;
}

const { controlCatalogJson, controlOpenApi } = load("src/main/control/controlCatalog.ts");
const { bearerAuthorized } = load("src/main/control/controlAuth.ts");
const { controlBootstrapText } = load("src/main/acp/controlBootstrapPrompt.ts");
const { applyTranscriptQuery } = load("src/main/control/transcriptQuery.ts");

test("catalog includes core session routes without blocking wait", () => {
  const catalog = controlCatalogJson("http://127.0.0.1:9/", "hint");
  assert.equal(catalog.baseUrl, "http://127.0.0.1:9/");
  assert.ok(catalog.routes.some((r) => r.method === "POST" && r.path === "/sessions"));
  assert.ok(catalog.routes.some((r) => r.path === "/sessions/:id/prompt"));
  assert.ok(catalog.routes.some((r) => r.path === "/sessions/:id/transcript" && r.query?.last));
  assert.ok(!catalog.routes.some((r) => r.path === "/sessions/:id/wait"));
  assert.ok(!catalog.routes.some((r) => r.method === "DELETE"));
  const prompt = catalog.routes.find((r) => r.path === "/sessions/:id/prompt");
  assert.equal(prompt.query, undefined);
  assert.doesNotMatch(prompt.example, /wait=1/);
});

test("openapi omits root catalog paths", () => {
  const doc = controlOpenApi("http://127.0.0.1:9/");
  assert.equal(doc.openapi, "3.0.3");
  assert.ok(doc.paths["/sessions"]);
  assert.equal(doc.paths["/"], undefined);
  assert.equal(doc.paths["/sessions/{id}/wait"], undefined);
});

test("bearerAuthorized accepts matching token", () => {
  assert.equal(bearerAuthorized("Bearer secret", "secret"), true);
  assert.equal(bearerAuthorized("Bearer nope", "secret"), false);
  assert.equal(bearerAuthorized(undefined, "secret"), false);
});

test("bootstrap text teaches fire-and-poll", () => {
  const text = controlBootstrapText();
  assert.match(text, /~\/\.switcheroo\/control\.json/);
  assert.match(text, /GET \//);
  assert.match(text, /turnId/);
  assert.match(text, /transcript\?last=1/);
  assert.match(text, /GET \/sessions/);
  assert.doesNotMatch(text, /wait=1/);
  assert.doesNotMatch(text, /Bearer [a-f0-9]{20,}/);
});

test("applyTranscriptQuery supports last=N", () => {
  const turns = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(applyTranscriptQuery(turns, new URLSearchParams()).length, 3);
  assert.deepEqual(
    applyTranscriptQuery(turns, new URLSearchParams("last=1")).map((t) => t.id),
    ["c"],
  );
  assert.deepEqual(
    applyTranscriptQuery(turns, new URLSearchParams("last=2")).map((t) => t.id),
    ["b", "c"],
  );
  assert.deepEqual(applyTranscriptQuery(turns, new URLSearchParams("last=0")), []);
  assert.equal(applyTranscriptQuery(turns, new URLSearchParams("last=nope")).length, 3);
});

function loadWithRelative(file) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    Buffer,
    console,
    URL,
    require: (name) =>
      name.startsWith(".") ? loadWithRelative(path.resolve(path.dirname(file), `${name}.ts`)) : require(name),
  });
  return exports;
}

test("POST /sessions creates the session without switching focus to it", async () => {
  const { handleControlRequest } = loadWithRelative(
    path.resolve(__dirname, "../src/main/control/controlRoutes.ts"),
  );
  const calls = [];
  const sessions = {
    createSession: async (input, options) => {
      calls.push({ input, options });
      return { id: "child-1" };
    },
  };
  const { PassThrough } = require("node:stream");
  const req = new PassThrough();
  Object.assign(req, {
    method: "POST",
    url: "/sessions",
    headers: { authorization: "Bearer secret" },
  });
  let status = 0;
  let body = "";
  const res = {
    writeHead: (code) => { status = code; },
    end: (payload) => { body = payload; },
  };
  const done = handleControlRequest(req, res, "secret", "http://127.0.0.1:1/", sessions);
  req.end(JSON.stringify({ agent: "claude", cwd: "/tmp", switcherooAware: true }));
  await done;
  assert.equal(status, 200);
  assert.equal(JSON.parse(body).id, "child-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.focus, false);
  assert.equal(calls[0].input.switcherooAware, true);
});
