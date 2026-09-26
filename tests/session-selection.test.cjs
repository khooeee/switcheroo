const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(file), name);
      const resolved = fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.js`;
      return load(path.relative(path.join(__dirname, ".."), resolved));
    },
  });
  return exports;
}

const { sessionIdsInRange } = load("src/renderer/features/sessions/sessionIdsInRange.ts");
const { nextSessionSelection } = load("src/renderer/features/sessions/nextSessionSelection.ts");

const order = ["a", "b", "c", "d"];

test("sessionIdsInRange is inclusive in either direction", () => {
  assert.deepEqual(sessionIdsInRange(order, "b", "d"), ["b", "c", "d"]);
  assert.deepEqual(sessionIdsInRange(order, "d", "b"), ["b", "c", "d"]);
});

test("plain click replaces the selection", () => {
  const next = nextSessionSelection(order, { selected: new Set(["a", "b"]), anchorId: "a" }, "c", {
    shift: false, toggle: false,
  });
  assert.deepEqual([...next.selected], ["c"]);
  assert.equal(next.anchorId, "c");
});

test("shift click selects a range from the anchor", () => {
  const next = nextSessionSelection(order, { selected: new Set(["a"]), anchorId: "a" }, "c", {
    shift: true, toggle: false,
  });
  assert.deepEqual([...next.selected], ["a", "b", "c"]);
  assert.equal(next.anchorId, "a");
});

test("toggle click adds and removes individual sessions", () => {
  const added = nextSessionSelection(order, { selected: new Set(["a"]), anchorId: "a" }, "c", {
    shift: false, toggle: true,
  });
  assert.deepEqual([...added.selected].sort(), ["a", "c"]);
  const removed = nextSessionSelection(order, added, "a", { shift: false, toggle: true });
  assert.deepEqual([...removed.selected], ["c"]);
});
