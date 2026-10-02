const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
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
  vm.runInNewContext(outputText, { exports, require });
  return exports;
}

const { airForkPoint } = load("src/main/acp/airForkPoint.ts");
const item = (id, role, text) => ({ id, role, text, at: 0 });
const turn = (assistant, events = []) => ({
  id: `turn-${Math.random()}`, at: 0, user: item(`user-${Math.random()}`, "user", "hi"),
  assistant, events, fileChanges: [], status: "complete",
});
const sha = (text) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

test("airForkPoint is undefined before any assistant message", () => {
  assert.equal(airForkPoint([]), undefined);
  assert.equal(airForkPoint([turn(null, [item("t1", "tool", "ls")])]), undefined);
});

test("airForkPoint targets the newest assistant message and counts repeats of its text", () => {
  const turns = [
    turn(item("msg_2", "assistant", "Done"), [item("msg_1", "assistant", "Done"), item("t1", "tool", "ls")]),
    turn(item("msg_3", "assistant", "Done")),
  ];
  assert.deepEqual({ ...airForkPoint(turns) }, { messageId: "msg_3", messageFingerprint: sha("Done"), messageOccurrence: 3 });
});

test("airForkPoint falls back to an earlier assistant in events when the turn was clipped", () => {
  const turns = [turn(null, [item("msg_1", "assistant", "Looking"), item("t1", "tool", "ls")])];
  assert.deepEqual({ ...airForkPoint(turns) }, { messageId: "msg_1", messageFingerprint: sha("Looking"), messageOccurrence: 1 });
});
