const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(file) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, process, require: (name) =>
    name.startsWith(".") ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name) });
  return exports;
}

const { forkSessionAtEvent } = load(path.resolve(__dirname, "../src/main/forkSessionAtEvent.ts"));
const item = (id, role, text) => ({ id, role, text, at: 0 });
const turn = (n) => ({
  id: `turn-${n}`, at: 0, user: item(`user-${n}`, "user", `ask ${n}`),
  assistant: item(`msg_${n}`, "assistant", `reply ${n}`), events: [], fileChanges: [], status: "complete",
});

function host(turns) {
  const calls = { sent: [], forkPoints: [], fresh: [] };
  const fakeAcp = { sessionId: "agent-2", restoreTurns() {} };
  const source = { id: "s1", title: "Demo", agent: "claude", cwd: "/tmp", agentSessionId: "agent-1", status: "ready", error: null, createdAt: 0 };
  return {
    calls,
    getSession: () => source,
    getTranscript: () => turns,
    listTitles: () => [],
    ensureSession: async (session) => {
      if (session !== source) calls.fresh.push(session.id);
      return { forkSibling: async (_id, _bus, _cb, point) => { calls.forkPoints.push(point); return fakeAcp; } , ...fakeAcp };
    },
    forkSupport: () => ({ supportsFork: true, supportsForkAtMessage: true }),
    callbacksFor: () => ({}), bus: () => ({}), setSession() {}, addSession() {},
    setActiveSession() {}, emitSessions() {}, persist: async () => {},
    send: (channel, payload) => calls.sent.push({ channel, payload }),
  };
}

test("forking on a user message ends history before its turn and drafts the message", async () => {
  const h = host([turn(1), turn(2)]);
  await forkSessionAtEvent(h, "s1", "user-2");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset").payload;
  assert.deepEqual([...reset.turns].map((entry) => entry.id), ["turn-1"]);
  assert.equal(reset.draft, "ask 2");
  assert.equal(h.calls.forkPoints[0].messageId, "msg_1");
});

test("forking on the first user message starts a fresh agent session", async () => {
  const h = host([turn(1)]);
  await forkSessionAtEvent(h, "s1", "user-1");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset").payload;
  assert.equal(reset.turns.length, 0);
  assert.equal(reset.draft, "ask 1");
  assert.equal(h.calls.forkPoints.length, 0);
  assert.equal(h.calls.fresh.length, 1);
});

test("forking on an assistant reply keeps its turn without a draft", async () => {
  const h = host([turn(1), turn(2)]);
  await forkSessionAtEvent(h, "s1", "msg_1");
  const reset = h.calls.sent.find((entry) => entry.channel === "transcript:reset").payload;
  assert.deepEqual([...reset.turns].map((entry) => entry.id), ["turn-1"]);
  assert.equal(reset.draft, undefined);
  assert.equal(h.calls.forkPoints[0].messageId, "msg_1");
});
