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
    id: "e1", sessionId: "t1", agent: "codex", at: 100, kind: "message",
    summary: "Hi", navigable: true,
  });
  const second = bus.append({
    id: "e1", sessionId: "t1", agent: "codex", at: 999, kind: "message",
    summary: "Hi there", navigable: true, sessionTitle: "Demo",
  });
  assert.equal(bus.list().length, 1);
  assert.equal(second.at, 100);
  assert.equal(second.summary, "Hi there");
  assert.equal(second.sessionTitle, "Demo");
  assert.equal(first.at, 100);
});

test("removeSession drops every event for that session", () => {
  const bus = new GlobalEventBus();
  bus.append({
    id: "e1", sessionId: "a", agent: "codex", at: 1, kind: "message",
    summary: "A", navigable: true,
  });
  bus.append({
    id: "e2", sessionId: "b", agent: "codex", at: 2, kind: "message",
    summary: "B", navigable: true,
  });
  bus.append({
    id: "e3", sessionId: "a", agent: "codex", at: 3, kind: "user",
    summary: "A2", navigable: true,
  });
  bus.removeSession("a");
  assert.equal(bus.list().length, 1);
  assert.equal(bus.list()[0].id, "e2");
});

test("removeOlderThan drops events strictly before the cutoff", () => {
  const bus = new GlobalEventBus();
  for (const [id, at] of [["a", 10], ["b", 20], ["c", 30]]) {
    bus.append({
      id, sessionId: "s", agent: "codex", at, kind: "message",
      summary: id, navigable: true,
    });
  }
  assert.equal(bus.removeOlderThan(20), 1);
  assert.equal(bus.list().map((e) => e.id).join(","), "b,c");
});
