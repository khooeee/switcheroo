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
  vm.runInNewContext(outputText, { exports, require, module: { exports } });
  return exports;
}

const { GlobalEventBus } = load("src/main/events.ts");

test("append with the same id updates in place and keeps the original at", () => {
  const bus = new GlobalEventBus();
  const first = bus.append({
    id: "e1", tabId: "t1", agentKind: "codex", at: 100, kind: "message",
    summary: "Hi", navigable: true,
  });
  const second = bus.append({
    id: "e1", tabId: "t1", agentKind: "codex", at: 999, kind: "message",
    summary: "Hi there", navigable: true, tabTitle: "Demo",
  });
  assert.equal(bus.list().length, 1);
  assert.equal(second.at, 100);
  assert.equal(second.summary, "Hi there");
  assert.equal(second.tabTitle, "Demo");
  assert.equal(first.at, 100);
});
