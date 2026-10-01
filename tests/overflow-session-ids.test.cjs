const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load() {
  const file = path.resolve(__dirname, "../src/main/overflowSessionIds.ts");
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require, module: { exports } });
  return exports;
}

const { overflowSessionIds } = load();

test("no overflow when under max or max disabled", () => {
  assert.equal(overflowSessionIds(["a", "b"], 300).length, 0);
  assert.equal(overflowSessionIds(["a", "b", "c"], 0).length, 0);
  assert.equal(overflowSessionIds(["a", "b", "c"], -1).length, 0);
});

test("drops from the end and keeps protectId", () => {
  assert.equal(overflowSessionIds(["a", "b", "c", "d"], 2).join(","), "d,c");
  assert.equal(overflowSessionIds(["a", "b", "c", "d"], 2, "d").join(","), "c,b");
  assert.equal(overflowSessionIds(["a", "b", "c"], 2, "c").join(","), "b");
});
