const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

test("questions across tabs and within a tab remain answerable until settled", () => {
  let state = [];
  let mounted = false;
  let receive, settle;
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/renderer/features/permissions/useAgentQuestions.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, window: { switcheroo: {
    onAskQuestion(cb) { receive = cb; return () => {}; },
    onQuestionSettled(cb) { settle = cb; return () => {}; },
  } }, require: () => ({
    useState: () => [state, (update) => { state = update(state); }],
    useEffect: (effect) => { if (!mounted) { effect(); mounted = true; } },
  }) });
  const render = exports.useAgentQuestions;
  assert.equal(render("a"), null);
  receive({ requestId: "a1", tabId: "a" });
  receive({ requestId: "b1", tabId: "b" });
  receive({ requestId: "a2", tabId: "a" });
  assert.equal(render("a").requestId, "a1");
  assert.equal(render("b").requestId, "b1");
  settle({ requestId: "a1" });
  assert.equal(render("a").requestId, "a2");
  assert.equal(render("b").requestId, "b1");
  settle({ requestId: "b1" });
  assert.equal(render("b"), null);
});
