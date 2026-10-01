const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load() {
  const file = path.resolve(__dirname, "../src/main/switchboardCleanup.ts");
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require, module: { exports } });
  return exports;
}

const { switchboardCleanupCutoff } = load();
const DAY = 24 * 60 * 60 * 1000;

test("cutoff is days before now; non-positive disables", () => {
  const now = 1_700_000_000_000;
  assert.equal(switchboardCleanupCutoff(30, now), now - 30 * DAY);
  assert.equal(switchboardCleanupCutoff(0, now), null);
  assert.equal(switchboardCleanupCutoff(-1, now), null);
  assert.equal(switchboardCleanupCutoff(Number.NaN, now), null);
});
