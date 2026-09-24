const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, exportName) {
  const source = fs.readFileSync(path.join(__dirname, "../src/renderer/features/chat", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require });
  return exports[exportName];
}

test("inserts quoted paths at the caret with spacing", () => {
  const insert = load("insertPromptPaths.ts", "insertPromptPaths");
  const mid = insert("look at this", 8, 8, [".switcheroo/pastes/a.png"]);
  assert.equal(mid.value, "look at .switcheroo/pastes/a.png this");
  const spaced = insert("", 0, 0, ["folder/my shot.png"]);
  assert.equal(spaced.value, `"folder/my shot.png"`);
  assert.equal(spaced.cursor, spaced.value.length);
});

test("collects image files from a paste payload", () => {
  const collect = load("pasteImageFiles.ts", "pasteImageFiles");
  const png = { type: "image/png", name: "clip.png" };
  const fromItems = collect({
    items: [{ kind: "file", type: "image/png", getAsFile: () => png }],
    files: [],
  });
  assert.equal(fromItems.length, 1);
  assert.equal(fromItems[0], png);
  const fromFiles = collect({ items: [], files: [png, { type: "text/plain" }] });
  assert.equal(fromFiles.length, 1);
  assert.equal(fromFiles[0], png);
  assert.equal(collect(null).length, 0);
});
