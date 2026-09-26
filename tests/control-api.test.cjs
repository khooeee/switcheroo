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

test("catalog includes core tab routes", () => {
  const catalog = controlCatalogJson("http://127.0.0.1:9/", "hint");
  assert.equal(catalog.baseUrl, "http://127.0.0.1:9/");
  assert.ok(catalog.routes.some((r) => r.method === "POST" && r.path === "/sessions"));
  assert.ok(catalog.routes.some((r) => r.path === "/sessions/:id/prompt"));
  assert.ok(!catalog.routes.some((r) => r.method === "DELETE"));
});

test("openapi omits root catalog paths", () => {
  const doc = controlOpenApi("http://127.0.0.1:9/");
  assert.equal(doc.openapi, "3.0.3");
  assert.ok(doc.paths["/sessions"]);
  assert.equal(doc.paths["/"], undefined);
});

test("bearerAuthorized accepts matching token", () => {
  assert.equal(bearerAuthorized("Bearer secret", "secret"), true);
  assert.equal(bearerAuthorized("Bearer nope", "secret"), false);
  assert.equal(bearerAuthorized(undefined, "secret"), false);
});

test("bootstrap text points at control.json and GET /", () => {
  const text = controlBootstrapText();
  assert.match(text, /~\/\.switcheroo\/control\.json/);
  assert.match(text, /GET \//);
  assert.doesNotMatch(text, /Bearer [a-f0-9]{20,}/);
});
