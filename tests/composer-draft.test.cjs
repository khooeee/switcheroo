const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadHook() {
  const exports = {};
  const source = fs.readFileSync(
    path.join(__dirname, "../src/renderer/features/chat/useComposerDraft.ts"),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const states = [];
  let hook;
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (name === "react") {
        return {
          useState(init) {
            const value = typeof init === "function" ? init() : init;
            const entry = { value, set: null };
            entry.set = (next) => { entry.value = typeof next === "function" ? next(entry.value) : next; };
            states.push(entry);
            return [entry.value, entry.set];
          },
          useEffect(effect) { effect(); },
        };
      }
      return require(name);
    },
  });
  hook = exports.useComposerDraft;
  return {
    run(sessionId) {
      states.length = 0;
      return hook(sessionId);
    },
    getDraft() { return states[0]?.value; },
  };
}

test("composer drafts persist per session without sharing state", () => {
  const h = loadHook();
  let [draft, setDraft] = h.run("a");
  assert.equal(draft, "");
  setDraft("hello");
  assert.equal(h.getDraft(), "hello");
  [draft, setDraft] = h.run("b");
  assert.equal(draft, "");
  setDraft("other");
  [draft] = h.run("a");
  assert.equal(draft, "hello");
});
