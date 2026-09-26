const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./session-fixture.cjs");
const tick = () => new Promise(setImmediate);

function childCallbacks() {
  const statuses = [], transcripts = [], capabilities = [], completions = [];
  return {
    statuses, transcripts, capabilities, completions,
    cb: {
      onStatus: (status) => statuses.push(status),
      onTranscript: (item) => transcripts.push(item),
      onSteeringSupport: (value) => capabilities.push(value),
      onPromptComplete: () => completions.push(true),
      onAskQuestion() {}, onPermission() {},
    },
  };
}

test("Codex forks resume before ready, route updates, and inherit steering", async () => {
  const f = await fixture();
  const c = childCallbacks();
  const child = await f.session.forkSibling("fork-tab", { append() {} }, c.cb);
  assert.equal(f.requests.at(-1).method, "resume");
  assert.equal(f.requests.at(-1).params.sessionId, "session-2");
  assert.equal(c.transcripts[0].text, "Resumed");
  assert.equal(f.transcripts.length, 0);
  assert.deepEqual(c.statuses, ["ready"]);
  assert.deepEqual(c.capabilities, [true]);

  const turn = child.prompt("ola");
  await tick();
  assert.equal(f.requests.at(-1).params.sessionId, "session-2");
  await child.prompt("hi");
  assert.equal(f.requests.at(-1).method, "_session/steering");
  assert.equal(f.requests.at(-1).params.sessionId, "session-2");
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Olá!" } }, "session-2");
  assert.equal(c.transcripts.at(-1).text, "Olá!");
  f.turns[0]({ stopReason: "end_turn" });
  await turn;
  assert.equal(c.statuses.at(-1), "ready");
  assert.equal(c.completions.length, 1);
  await child.dispose();
  assert.equal(f.disconnected.signal.aborted, false);
  await f.session.dispose();
  assert.equal(f.disconnected.signal.aborted, true);
});

test("Claude forks resume before ready so prompts can run", async () => {
  const f = await fixture(false, { agentKind: "claude" });
  const c = childCallbacks();
  const child = await f.session.forkSibling("fork-tab", { append() {} }, c.cb);
  assert.equal(f.requests.at(-1).method, "resume");
  assert.equal(f.requests.at(-1).params.sessionId, "session-2");
  const turn = child.prompt("hello");
  await tick();
  assert.equal(f.requests.at(-1).method, "prompt");
  assert.equal(f.requests.at(-1).params.sessionId, "session-2");
  f.turns[0]({ stopReason: "end_turn" });
  await turn;
  await child.dispose();
  await f.session.dispose();
});

test("failed fork resume rejects without marking ready or closing the source", async () => {
  const f = await fixture(true, { resumeError: "Subscription failed" });
  const c = childCallbacks();
  await assert.rejects(f.session.forkSibling("fork-tab", { append() {} }, c.cb), /Subscription failed/);
  assert.equal(c.statuses.includes("ready"), false);
  assert.equal(f.disconnected.signal.aborted, false);
  const turn = f.session.prompt("source still works");
  await tick();
  f.turns[0]({ stopReason: "end_turn" });
  await turn;
  await f.session.dispose();
  assert.equal(f.disconnected.signal.aborted, true);
});
