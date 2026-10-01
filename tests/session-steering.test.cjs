const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./session-fixture.cjs");
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


test("parallel questions settle independently and cancellation releases remaining requests", async () => {
  const f = await fixture();
  const turn = f.session.prompt("ask");
  await tick();
  const ask = () => f.handlers.get("cursor/ask_question")({ params: { questions: [] } });
  const first = ask();
  const second = ask();
  f.session.respondAskQuestion(f.questions[1].requestId, { outcome: "skipped" });
  assert.equal((await second).outcome, "skipped");
  await f.session.cancel();
  assert.equal((await first).outcome, "cancelled");
  assert.equal(f.settled.length, 2);
  f.turns[0]({ stopReason: "cancelled" });
  await turn;
});

test("request abort and disconnect release questions", async () => {
  const f = await fixture();
  const controller = new AbortController();
  const first = f.handlers.get("cursor/ask_question")({ params: {}, signal: controller.signal });
  controller.abort();
  assert.equal((await first).outcome, "cancelled");
  const second = f.handlers.get("cursor/ask_question")({ params: {} });
  f.disconnected.abort();
  assert.equal((await second).outcome, "cancelled");
  assert.equal(f.statuses.at(-1), "error");
});

test("turn end clears stale tools but keeps tools active during a remote continuation", async () => {
  const f = await fixture();
  const turn = f.session.prompt("work");
  await tick();
  f.update({ sessionUpdate: "tool_call", toolCallId: "tool", title: "Work", status: "pending" });
  f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type: "active" } } } });
  f.turns[0]({ stopReason: "end_turn" });
  await turn;
  assert.equal(f.transcripts.at(-1).toolStatus, "pending");
  f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type: "idle" } } } });
  assert.equal(f.transcripts.at(-1).toolStatus, "status unavailable");
  f.update({ sessionUpdate: "tool_call_update", toolCallId: "tool", status: "completed" });
  assert.equal(f.transcripts.at(-1).toolStatus, "completed");
});
