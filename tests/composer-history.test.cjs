const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(modulePath) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, modulePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require });
  return exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const {
  applyComposerHistoryEdit,
  applyComposerHistoryKey,
  emptyComposerHistory,
} = load("../src/renderer/features/chat/composerHistory.ts");
const { userPromptHistory } = load("../src/renderer/features/chat/userPromptHistory.ts");

test("userPromptHistory is newest-first non-empty user texts", () => {
  assert.deepEqual(
    plain(userPromptHistory([
      {
        id: "t1", at: 1, status: "complete", events: [], fileChanges: [],
        user: { id: "1", role: "user", text: "first", at: 1 },
        assistant: { id: "2", role: "assistant", text: "ok", at: 2 },
      },
      {
        id: "t2", at: 3, status: "complete", events: [], fileChanges: [],
        user: { id: "3", role: "user", text: "  ", at: 3 },
        assistant: null,
      },
      {
        id: "t3", at: 4, status: "complete", events: [], fileChanges: [],
        user: { id: "4", role: "user", text: "second\n", at: 4 },
        assistant: null,
      },
    ])),
    ["second", "first"],
  );
});

test("composer history cycles from empty and returns to empty", () => {
  const history = ["newest", "older"];
  let state = emptyComposerHistory;

  let step = applyComposerHistoryKey(state, "ArrowUp", "", history);
  assert.deepEqual(plain(step), { state: { index: 0, locked: false }, draft: "newest" });
  state = step.state;

  step = applyComposerHistoryKey(state, "ArrowUp", "newest", history);
  assert.deepEqual(plain(step), { state: { index: 1, locked: false }, draft: "older" });
  state = step.state;

  step = applyComposerHistoryKey(state, "ArrowUp", "older", history);
  assert.deepEqual(plain(step), { state: { index: 1, locked: false }, draft: "older" });

  step = applyComposerHistoryKey(state, "ArrowDown", "older", history);
  assert.deepEqual(plain(step), { state: { index: 0, locked: false }, draft: "newest" });
  state = step.state;

  step = applyComposerHistoryKey(state, "ArrowDown", "newest", history);
  assert.deepEqual(plain(step), { state: { index: null, locked: false }, draft: "" });
});

test("composer history ignores Up when draft is non-empty and not browsing", () => {
  assert.equal(
    applyComposerHistoryKey(emptyComposerHistory, "ArrowUp", "typed", ["past"]),
    null,
  );
});

test("editing while browsing locks until draft is cleared", () => {
  let state = { index: 0, locked: false };
  state = applyComposerHistoryEdit(state, "newest edited");
  assert.deepEqual(plain(state), { index: null, locked: true });
  assert.equal(applyComposerHistoryKey(state, "ArrowUp", "newest edited", ["past"]), null);
  state = applyComposerHistoryEdit(state, "");
  assert.deepEqual(plain(state), { index: null, locked: false });
  assert.deepEqual(
    plain(applyComposerHistoryKey(state, "ArrowUp", "", ["past"])),
    { state: { index: 0, locked: false }, draft: "past" },
  );
});
