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

function turn(id, sessionId, at, text = id) {
  return {
    id,
    at,
    user: { id: `${id}-u`, role: "user", text, at },
    assistant: null,
    events: [],
    fileChanges: [],
    status: "complete",
    sessionId,
    agent: "codex",
    navigable: true,
  };
}

test("append with the same id updates in place and keeps the original at", () => {
  const bus = new GlobalEventBus();
  const first = bus.append(turn("e1", "t1", 100, "Hi"));
  const second = bus.append({
    ...turn("e1", "t1", 999, "Hi there"),
    sessionTitle: "Demo",
    assistant: { id: "a1", role: "assistant", text: "Hi there", at: 999 },
  });
  assert.equal(bus.list().length, 1);
  assert.equal(second.at, 100);
  assert.equal(second.assistant.text, "Hi there");
  assert.equal(second.sessionTitle, "Demo");
  assert.equal(first.at, 100);
});

test("removeSession drops every turn for that session", () => {
  const bus = new GlobalEventBus();
  bus.append(turn("e1", "a", 1, "A"));
  bus.append(turn("e2", "b", 2, "B"));
  bus.append(turn("e3", "a", 3, "A2"));
  bus.removeSession("a");
  assert.equal(bus.list().length, 1);
  assert.equal(bus.list()[0].id, "e2");
});

test("removeOlderThan drops turns strictly before the cutoff", () => {
  const bus = new GlobalEventBus();
  for (const [id, at] of [["a", 10], ["b", 20], ["c", 30]]) {
    bus.append(turn(id, "s", at));
  }
  assert.equal(bus.removeOlderThan(20), 1);
  assert.equal(bus.list().map((e) => e.id).join(","), "b,c");
});
