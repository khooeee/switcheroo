const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PassThrough } = require("node:stream");
const { test } = require("node:test");
const ts = require("typescript");

async function fixture(supported = true) {
  const notifications = new Map();
  const requests = [];
  const turns = [];
  const failures = [];
  const statuses = [];
  const transcripts = [];
  const capabilities = [];
  const events = [];
  const completions = [];
  const cancellations = [];
  let steeringResult = { outcome: "injected" };
  const connection = {
    close() {},
    agent: { notify: async (method, params) => { cancellations.push({ method, params }); }, request: async (method, params) => {
      requests.push({ method, params });
      if (method === "initialize") return { _meta: { steering: { supported } } };
      if (method === "new") return { sessionId: "session-1" };
      if (method === "prompt") return new Promise((resolve, reject) => { turns.push(resolve); failures.push(reject); });
      if (method === "_session/steering") return steeringResult;
      throw new Error(`Unexpected request ${method}`);
    } },
  };
  const builder = {
    onRequest() { return this; },
    onNotification(method, handler) { notifications.set(method, handler); return this; },
    connect() { return connection; },
  };
  const acp = {
    PROTOCOL_VERSION: 1, client: () => builder, ndJsonStream() {},
    methods: {
      agent: { initialize: "initialize", session: { new: "new", prompt: "prompt", cancel: "cancel" } },
      client: { session: { requestPermission: "permission", update: "update" },
        fs: { readTextFile: "read", writeTextFile: "write" } },
    },
  };
  const child = { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(),
    on() {}, kill() {} };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, { exports, process, console, require: (name) => {
      if (name === "@agentclientprotocol/sdk") return acp;
      if (name === "node:child_process") return { spawn: () => child };
      if (name === "./presets") return { AGENT_PRESETS: { codex: { command: "fake", args: [] } }, agentLabel: () => "Codex" };
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), `${name}.ts`));
      return require(name);
    } });
    return exports;
  }
  const { AcpSession } = load(path.join(__dirname, "../src/main/acp/session.ts"));
  const session = new AcpSession("tab-1", "codex", "/tmp", { append(event) { events.push(event); }, updateSummary() {} }, {
    onPromptComplete: () => completions.push(true),
    onStatus: (status) => statuses.push(status),
    onTranscript: (item) => transcripts.push(item),
    onSteeringSupport: (value) => capabilities.push(value),
    onPermission() {}, onAskQuestion() {},
  });
  await session.start();
  return {
    session, requests, turns, failures, statuses, transcripts, capabilities, cancellations, events, completions,
    setOutcome: (outcome) => { steeringResult = { outcome }; },
    update: (update) => notifications.get("update")({ params: { sessionId: "session-1", update } }),
  };
}
const tick = () => new Promise(setImmediate);

test("interrupting adds one stopped event per turn and ignores idle interruptions", async () => {
  const f = await fixture();
  await f.session.cancel();
  assert.equal(f.cancellations.length, 0);
  for (let i = 0; i < 2; i++) {
    const turn = f.session.prompt("work");
    await tick();
    await Promise.all([f.session.cancel(), f.session.cancel()]);
    assert.equal(f.cancellations.length, i + 1);
    assert.equal(f.transcripts.filter((item) => item.role === "stopped" && item.text === "Stopped").length, i + 1);
    const stopped = f.events.filter((event) => event.kind === "stopped");
    assert.equal(stopped.length, i + 1);
    assert.equal(stopped.at(-1).id, f.transcripts.at(-1).id);
    assert.equal(stopped.at(-1).summary, "Stopped");
    assert.equal(stopped.at(-1).navigable, true);
    f.turns[i]({ stopReason: "cancelled" });
    await turn;
    assert.equal(f.completions.length, 0);
  }
});

test("startup capability enables steering without a second prompt or duplicate transcript", async () => {
  const f = await fixture();
  assert.deepEqual(f.capabilities, [true]);
  const original = f.session.prompt("original");
  await tick();
  await f.session.prompt("steering instruction");
  const steer = f.requests.find((request) => request.method === "_session/steering");
  assert.equal(steer.params._meta.steering.idleBehavior, "promptRequired");
  assert.equal(steer.params.sessionId, "session-1");
  assert.equal(f.turns.length, 1);
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Steered output" } });
  assert.equal(f.transcripts.at(-1).text, "Steered output");
  assert.equal(f.transcripts.filter((item) => item.role === "user").length, 2);
  f.turns[0]({ stopReason: "end_turn" });
  await original;
  assert.equal(f.statuses.at(-1), "ready");
  assert.equal(f.completions.length, 1);
});

test("an adapter without steering queues follow-ups until completion", async () => {
  const f = await fixture(false);
  const original = f.session.prompt("original");
  const next = f.session.prompt("follow-up");
  await tick();
  assert.equal(f.turns.length, 1);
  assert.equal(f.requests.some((request) => request.method === "_session/steering"), false);
  f.turns[0]({ stopReason: "end_turn" });
  await original;
  await tick();
  assert.equal(f.turns.length, 2);
  f.turns[1]({ stopReason: "end_turn" });
  await next;
  assert.equal(f.completions.length, 2);
});

test("a detached Codex continuation keeps streaming after the original prompt resolves", async () => {
  const f = await fixture();
  const original = f.session.prompt("original");
  await tick();
  f.setOutcome("startedNewTurn");
  f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type: "active" } } } });
  await f.session.prompt("late steering");
  f.turns[0]({ stopReason: "end_turn" });
  await original;
  assert.equal(f.statuses.at(-1), "running");
  assert.equal(f.completions.length, 0);
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Continuation" } });
  assert.equal(f.transcripts.at(-1).text, "Continuation");
  f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type: "idle" } } } });
  assert.equal(f.statuses.at(-1), "ready");
  assert.equal(f.completions.length, 1);
});


test("completion sounds stay silent on startup, failures, and disposal", async () => {
  const f = await fixture();
  assert.equal(f.completions.length, 0);
  const failed = f.session.prompt("fail");
  const rejection = assert.rejects(failed, /Agent failed/);
  await tick();
  f.failures[0](new Error("Agent failed"));
  await rejection;
  assert.equal(f.completions.length, 0);
  const disposed = f.session.prompt("close before done");
  await tick();
  await f.session.dispose();
  f.turns[1]({ stopReason: "end_turn" });
  await disposed;
  assert.equal(f.completions.length, 0);
});

test("idle updates do not duplicate completion or announce it before the response", async () => {
  const f = await fixture();
  const turn = f.session.prompt("work");
  await tick();
  const status = (type) => f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type } } } });
  status("active");
  status("idle");
  assert.equal(f.completions.length, 0);
  f.turns[0]({ stopReason: "end_turn" });
  await turn;
  status("idle");
  assert.equal(f.completions.length, 1);
});
