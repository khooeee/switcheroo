import { expect, test } from "vitest";
import type { SessionCallbacks } from "../src/main/acp/SessionCallbacks";
import { fixture } from "./session-fixture";

const tick = () => new Promise(setImmediate);

function childCallbacks() {
  const statuses: string[] = [];
  const transcripts: Array<{ assistant?: { text?: string } | null }> = [];
  const capabilities: boolean[] = [];
  const completions: boolean[] = [];
  const cb: SessionCallbacks = {
    onStatus: (status) => statuses.push(status),
    onTurn: (turn) => transcripts.push(turn),
    onTurnRemoved() {},
    onSteeringSupport: (value) => capabilities.push(value),
    onForkSupport() {},
    onAvailableCommands() {},
    onUsage() {},
    onPromptComplete: () => completions.push(true),
    onAskQuestion() {},
    onPermission() {},
    getSessionTitle: () => "Fork session",
  };
  return { statuses, transcripts, capabilities, completions, cb };
}

test("Codex forks resume before ready, route updates, and inherit steering", async () => {
  const f = await fixture();
  const c = childCallbacks();
  const child = await f.session.forkSibling("fork-session", c.cb);
  expect(f.requests.at(-1)?.method).toBe("resume");
  expect((f.requests.at(-1)?.params as { sessionId: string }).sessionId).toBe("session-2");
  expect(c.transcripts.length).toBe(0);
  expect(f.transcripts.length).toBe(0);
  expect(c.statuses).toEqual(["ready"]);
  expect(c.capabilities).toEqual([true]);

  f.update(
    { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Replay" } },
    "session-2",
  );
  expect(c.transcripts.length).toBe(0);
  expect(f.transcripts.length).toBe(0);

  const turn = child.prompt("ola");
  await tick();
  expect((f.requests.at(-1)?.params as { sessionId: string }).sessionId).toBe("session-2");
  await child.prompt("hi");
  expect(f.requests.at(-1)?.method).toBe("_session/steering");
  expect((f.requests.at(-1)?.params as { sessionId: string }).sessionId).toBe("session-2");
  f.update(
    { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Olá!" } },
    "session-2",
  );
  expect(c.transcripts.at(-1)?.assistant?.text).toBe("Olá!");
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;
  expect(c.statuses.at(-1)).toBe("ready");
  expect(c.completions.length).toBe(1);
  await child.dispose();
  expect(f.disconnected.signal.aborted).toBe(false);
  await f.session.dispose();
  expect(f.disconnected.signal.aborted).toBe(true);
});

test("Claude forks resume before ready so prompts can run", async () => {
  const f = await fixture(false, { agent: "claude" });
  const c = childCallbacks();
  const child = await f.session.forkSibling("fork-session", c.cb);
  expect(f.requests.at(-1)?.method).toBe("resume");
  expect((f.requests.at(-1)?.params as { sessionId: string }).sessionId).toBe("session-2");
  const turn = child.prompt("hello");
  await tick();
  expect(f.requests.at(-1)?.method).toBe("prompt");
  expect((f.requests.at(-1)?.params as { sessionId: string }).sessionId).toBe("session-2");
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;
  await child.dispose();
  await f.session.dispose();
});

test("failed fork resume rejects without marking ready or closing the source", async () => {
  const f = await fixture(true, { resumeError: "Subscription failed" });
  const c = childCallbacks();
  await expect(f.session.forkSibling("fork-session", c.cb)).rejects.toThrow(/Subscription failed/);
  expect(c.statuses.includes("ready")).toBe(false);
  expect(f.disconnected.signal.aborted).toBe(false);
  const turn = f.session.prompt("source still works");
  await tick();
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;
  await f.session.dispose();
});

test("initialize reports whether the agent advertises session/fork", async () => {
  const forking = await fixture(true, { agentCapabilities: { sessionCapabilities: { fork: {} } } });
  expect(forking.forkSupport).toEqual([true]);
  await forking.session.dispose();
  const plain = await fixture(true, { agentCapabilities: { sessionCapabilities: { resume: {} } } });
  expect(plain.forkSupport).toEqual([false]);
  await plain.session.dispose();
});

test("fork points are sent as the AIR fork _meta the adapters read", async () => {
  const f = await fixture(false, { agent: "claude" });
  const point = {
    messageId: "msg_1",
    messageFingerprint: `sha256:${"a".repeat(64)}`,
    messageOccurrence: 2,
  };
  const child = await f.session.forkSibling("fork-session", childCallbacks().cb, point);
  const fork = f.requests.find((request) => request.method === "fork");
  expect(JSON.parse(JSON.stringify((fork?.params as { _meta: unknown })._meta))).toEqual({
    jetbrains: { air: { fork: { version: 1, ...point } } },
  });
  await child.dispose();
  const whole = await f.session.forkSibling("fork-whole", childCallbacks().cb);
  expect(
    (f.requests.filter((request) => request.method === "fork").at(-1)?.params as { _meta?: unknown })
      ._meta,
  ).toBeUndefined();
  await whole.dispose();
  await f.session.dispose();
});
