const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/renderer/features/notes/clampNotesWidth.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { clampNotesWidth, defaultNotesWidth } = loaded;

test("clamps notes width into the allowed range", () => {
  assert.equal(clampNotesWidth(Number.NaN), defaultNotesWidth);
  assert.equal(clampNotesWidth(10), 180);
  assert.equal(clampNotesWidth(9999), 640);
  assert.equal(clampNotesWidth(320.6), 321);
});
