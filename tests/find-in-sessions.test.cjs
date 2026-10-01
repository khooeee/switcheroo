const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(relative) {
  const file = path.resolve(__dirname, relative);
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require, module: { exports } });
  return exports;
}

const { findInSessionSources, matchSnippet } = load("../src/main/findInSessionSources.ts");
const { groupFindHits } = load("../src/renderer/features/find/groupFindHits.ts");

function turn(id, userText, assistantText, at) {
  return {
    id,
    at,
    user: { id: `${id}-u`, role: "user", text: userText, at },
    assistant: assistantText
      ? { id: `${id}-a`, role: "assistant", text: assistantText, at: at + 1 }
      : null,
    events: [],
    fileChanges: [],
    status: "complete",
  };
}

test("empty query returns no hits", () => {
  assert.equal(findInSessionSources([{
    sessionId: "s1",
    title: "Demo",
    agent: "claude",
    turns: [turn("t1", "hello world", null, 1)],
  }], "  ").length, 0);
});

test("hits sorted by timestamp descending across sessions", () => {
  const hits = findInSessionSources([
    {
      sessionId: "old",
      title: "Old",
      agent: "claude",
      turns: [turn("t1", "alpha", "find ME please", 1)],
    },
    {
      sessionId: "new",
      title: "New",
      agent: "cursor",
      turns: [turn("t2", "Find me too", null, 5)],
    },
  ], "FIND ME");
  assert.equal(hits.map((hit) => hit.eventId).join(","), "t1-a,t2-u");
  assert.equal(hits[0].turnId, "t1");
  assert.equal(hits[0].at, 2);
});

test("groupFindHits keeps session order from newest match", () => {
  const groups = groupFindHits([
    { sessionId: "b", turnId: "tb", eventId: "2", title: "B", agent: "claude", role: "user", snippet: "x", at: 20 },
    { sessionId: "a", turnId: "ta", eventId: "1", title: "A", agent: "claude", role: "user", snippet: "x", at: 15 },
    { sessionId: "b", turnId: "tb", eventId: "3", title: "B", agent: "claude", role: "assistant", snippet: "y", at: 5 },
  ]);
  assert.equal(groups.map((group) => group.sessionId).join(","), "b,a");
  assert.equal(groups[0].hits.map((hit) => hit.eventId).join(","), "2,3");
  assert.equal(groups[0].title, "B");
});

test("optional limit still applies when provided", () => {
  const turns = Array.from({ length: 5 }, (_, i) => turn(`t${i}`, "needle", null, i));
  const hits = findInSessionSources([{
    sessionId: "s",
    title: "T",
    agent: "codex",
    turns,
  }], "needle", 2);
  assert.equal(hits.length, 2);
  assert.equal(hits.map((hit) => hit.at).join(","), "4,3");
});

test("uncapped by default", () => {
  const turns = Array.from({ length: 5 }, (_, i) => turn(`t${i}`, "needle", null, i));
  assert.equal(findInSessionSources([{
    sessionId: "s",
    title: "T",
    agent: "codex",
    turns,
  }], "needle").length, 5);
});

test("snippet centers on the match", () => {
  const text = `${"x".repeat(60)}UNIQUE${"y".repeat(60)}`;
  const snippet = matchSnippet(text, "unique");
  assert.match(snippet, /UNIQUE/);
  assert.match(snippet, /^…/);
  assert.match(snippet, /…$/);
});
