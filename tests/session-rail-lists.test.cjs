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

const {
  pinSessionInLists,
  unpinSessionInLists,
  prependUnpinnedInLists,
  reorderPinnedInLists,
  loadListsFromPersisted,
  nextActiveAfterClose,
} = load("src/main/sessionRailLists.ts");

const base = { pinnedIds: ["p1", "p2"], unpinnedIds: ["u1", "u2", "u3"] };

test("pin moves id from unpinned to end of pinned", () => {
  const next = pinSessionInLists(base, "u2");
  assert.equal(next.pinnedIds.join(","), "p1,p2,u2");
  assert.equal(next.unpinnedIds.join(","), "u1,u3");
});

test("unpin prepends to unpinned", () => {
  const next = unpinSessionInLists(base, "p2");
  assert.equal(next.pinnedIds.join(","), "p1");
  assert.equal(next.unpinnedIds.join(","), "p2,u1,u2,u3");
});

test("prependUnpinned ignores pinned ids", () => {
  const next = prependUnpinnedInLists(base, "p1");
  assert.deepEqual(next, base);
});

test("reorderPinned only permutes pinned section", () => {
  const open = new Set(["p1", "p2", "u1", "u2", "u3"]);
  const next = reorderPinnedInLists(base, ["p2", "p1"], open);
  assert.equal(next.pinnedIds.join(","), "p2,p1");
  assert.equal(next.unpinnedIds.join(","), "u1,u2,u3");
});

test("loadListsFromPersisted keeps id order and drops duplicates", () => {
  const loaded = loadListsFromPersisted(["p1", "p2", "p1"], ["u1", "p2", "u2"]);
  assert.equal(loaded.lists.pinnedIds.join(","), "p1,p2");
  assert.equal(loaded.lists.unpinnedIds.join(","), "u1,u2");
  assert.equal(loaded.openIds.join(","), "p1,p2,u1,u2");
});

test("nextActiveAfterClose prefers next, then previous, then null", () => {
  assert.equal(nextActiveAfterClose(base, "u1"), "u2");
  assert.equal(nextActiveAfterClose(base, "u3"), "u2");
  assert.equal(nextActiveAfterClose(base, "p1"), "p2");
  assert.equal(nextActiveAfterClose({ pinnedIds: ["only"], unpinnedIds: [] }, "only"), null);
  assert.equal(nextActiveAfterClose(base, "missing"), null);
});
