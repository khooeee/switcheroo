const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load() {
  const file = path.join(__dirname, "../src/shared/formatAgentError.ts");
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require });
  return exports;
}

const { formatAgentError } = load();

test("prefers RequestError data.details over Internal error", () => {
  const error = Object.assign(new Error("Internal error"), {
    data: { details: "pi compact failed: Nothing to compact (session too small)" },
  });
  assert.equal(
    formatAgentError(error),
    "pi compact failed: Nothing to compact (session too small)",
  );
});

test("falls back to message when details are missing", () => {
  assert.equal(formatAgentError(new Error("boom")), "boom");
  assert.equal(formatAgentError("plain"), "plain");
});

test("strips Electron IPC invoke prefix", () => {
  assert.equal(
    formatAgentError(new Error("Error invoking remote method 'session:prompt': boom")),
    "boom",
  );
});
