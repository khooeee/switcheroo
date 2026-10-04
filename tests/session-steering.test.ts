import { expect, test } from "vitest";
import { fixture } from "./session-fixture";

const tick = () => new Promise(setImmediate);

function toolEvent(turn: { events: Array<{ role: string; toolStatus?: string }> }) {
  return [...turn.events].reverse().find((event) => event.role === "tool");
}

test("interrupting adds one stopped turn per cancel and ignores idle interruptions", async () => {
  const f = await fixture();
  await f.session.cancel();
  expect(f.cancellations.length).toBe(0);
  for (let i = 0; i < 2; i++) {
    const turn = f.session.prompt("work");
    await tick();
    await Promise.all([f.session.cancel(), f.session.cancel()]);
    expect(f.cancellations.length).toBe(i + 1);
    expect(f.transcripts.filter((entry) => entry.status === "stopped").length).toBe(i + 1);
    expect(f.transcripts.at(-1)!.events.some((event) => event.role === "stopped")).toBe(true);
    f.turns[i]!({ stopReason: "cancelled" });
    await turn;
    expect(f.completions.length).toBe(0);
  }
});

test("startup capability enables steering without a second prompt or duplicate transcript", async () => {
  const f = await fixture();
  expect(f.capabilities).toEqual([true]);
  const original = f.session.prompt("original");
  await tick();
  await f.session.prompt("steering instruction");
  const steer = f.requests.find((request) => request.method === "_session/steering") as {
    params: { _meta: { steering: { idleBehavior: string } }; sessionId: string };
  };
  expect(steer.params._meta.steering.idleBehavior).toBe("promptRequired");
  expect(steer.params.sessionId).toBe("session-1");
  expect(f.turns.length).toBe(1);
  const turn = f.transcripts.at(-1)!;
  expect(
    turn.events.some((event) => event.role === "user" && event.text === "steering instruction"),
  ).toBe(true);
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Steered output" } });
  expect(f.transcripts.at(-1)?.assistant?.text).toBe("Steered output");
  expect(f.transcripts.at(-1)?.id).toBe(turn.id);
  f.turns[0]!({ stopReason: "end_turn" });
  await original;
  expect(f.statuses.at(-1)).toBe("ready");
  expect(f.completions.length).toBe(1);
});

test("an adapter without steering queues follow-ups until completion", async () => {
  const f = await fixture(false);
  const original = f.session.prompt("original");
  const next = f.session.prompt("follow-up");
  await tick();
  expect(f.turns.length).toBe(1);
  expect(f.requests.some((request) => request.method === "_session/steering")).toBe(false);
  f.turns[0]!({ stopReason: "end_turn" });
  await original;
  await tick();
  expect(f.turns.length).toBe(2);
  f.turns[1]!({ stopReason: "end_turn" });
  await next;
  expect(f.completions.length).toBe(2);
});

test("a detached Codex continuation keeps streaming after the original prompt resolves", async () => {
  const f = await fixture();
  const original = f.session.prompt("original");
  await tick();
  f.setOutcome("startedNewTurn");
  f.update({
    sessionUpdate: "session_info_update",
    _meta: { codex: { threadStatus: { type: "active" } } },
  });
  await f.session.prompt("late steering");
  f.turns[0]!({ stopReason: "end_turn" });
  await original;
  expect(f.statuses.at(-1)).toBe("running");
  expect(f.completions.length).toBe(0);
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Continuation" } });
  expect(f.transcripts.at(-1)?.assistant?.text).toBe("Continuation");
  f.update({
    sessionUpdate: "session_info_update",
    _meta: { codex: { threadStatus: { type: "idle" } } },
  });
  expect(f.statuses.at(-1)).toBe("ready");
  expect(f.completions.length).toBe(1);
});

test("completion sounds stay silent on startup, failures, and disposal", async () => {
  const f = await fixture();
  expect(f.completions.length).toBe(0);
  const failed = f.session.prompt("fail");
  const rejection = expect(failed).rejects.toThrow(/Agent failed/);
  await tick();
  f.failures[0]!(new Error("Agent failed"));
  await rejection;
  expect(f.completions.length).toBe(0);
  expect(f.transcripts.at(-1)?.status).toBe("complete");
  const disposed = f.session.prompt("close before done");
  await tick();
  await f.session.dispose();
  f.turns[1]!({ stopReason: "end_turn" });
  await disposed;
  expect(f.completions.length).toBe(0);
});

test("session-not-found on prompt retries with a fresh session and completes the turn", async () => {
  const f = await fixture();
  const pending = f.session.prompt("hi");
  await tick();
  f.failures[0]!(
    Object.assign(new Error("Internal error"), { data: { details: "Session not found" } }),
  );
  await tick();
  expect(f.turns.length).toBe(2);
  f.update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Hello" } });
  f.turns[1]!({ stopReason: "end_turn" });
  await pending;
  const turn = f.transcripts.at(-1)!;
  expect(turn.status).toBe("complete");
  expect(turn.assistant?.text).toBe("Hello");
  expect(f.completions.length).toBe(1);
  expect(f.requests.some((request) => request.method === "new")).toBe(true);
});

test("idle updates do not duplicate completion or announce it before the response", async () => {
  const f = await fixture();
  const turn = f.session.prompt("work");
  await tick();
  const status = (type: string) =>
    f.update({ sessionUpdate: "session_info_update", _meta: { codex: { threadStatus: { type } } } });
  status("active");
  status("idle");
  expect(f.completions.length).toBe(0);
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;
  status("idle");
  expect(f.completions.length).toBe(1);
});

test("parallel questions settle independently and cancellation releases remaining requests", async () => {
  const f = await fixture();
  const turn = f.session.prompt("ask");
  await tick();
  const ask = () =>
    (f.handlers.get("cursor/ask_question") as (msg: { params: unknown }) => Promise<{ outcome: string }>)({
      params: { questions: [] },
    });
  const first = ask();
  const second = ask();
  f.session.respondAskQuestion(f.questions[1]!.requestId, { outcome: "skipped" });
  expect((await second).outcome).toBe("skipped");
  await f.session.cancel();
  expect((await first).outcome).toBe("cancelled");
  expect(f.settled.length).toBe(2);
  f.turns[0]!({ stopReason: "cancelled" });
  await turn;
});

test("request abort and disconnect release questions", async () => {
  const f = await fixture();
  const controller = new AbortController();
  const first = (
    f.handlers.get("cursor/ask_question") as (msg: {
      params: unknown;
      signal?: AbortSignal;
    }) => Promise<{ outcome: string }>
  )({ params: {}, signal: controller.signal });
  controller.abort();
  expect((await first).outcome).toBe("cancelled");
  const second = (
    f.handlers.get("cursor/ask_question") as (msg: { params: unknown }) => Promise<{ outcome: string }>
  )({ params: {} });
  f.disconnected.abort();
  expect((await second).outcome).toBe("cancelled");
  expect(f.statuses.at(-1)).toBe("error");
});

test("turn end clears stale tools but keeps tools active during a remote continuation", async () => {
  const f = await fixture();
  const turn = f.session.prompt("work");
  await tick();
  f.update({ sessionUpdate: "tool_call", toolCallId: "tool", title: "Work", status: "pending" });
  f.update({
    sessionUpdate: "session_info_update",
    _meta: { codex: { threadStatus: { type: "active" } } },
  });
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;
  expect(toolEvent(f.transcripts.at(-1)!)?.toolStatus).toBe("pending");
  f.update({
    sessionUpdate: "session_info_update",
    _meta: { codex: { threadStatus: { type: "idle" } } },
  });
  expect(toolEvent(f.transcripts.at(-1)!)?.toolStatus).toBe("status unavailable");
  f.update({ sessionUpdate: "tool_call_update", toolCallId: "tool", status: "completed" });
  expect(toolEvent(f.transcripts.at(-1)!)?.toolStatus).toBe("completed");
});
