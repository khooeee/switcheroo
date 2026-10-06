import { expect, test } from "vitest";
import type * as acp from "@agentclientprotocol/sdk";
import { fixture } from "./session-fixture";
import { rewriteSubagentUpdates } from "../src/main/acp/subagents/rewriteSubagentUpdates";
import { parseSubagentNotification } from "../src/main/acp/subagents/parseSubagentNotification";
import { SUBAGENT_UPDATE_METHOD } from "../src/main/acp/subagents/subagentUpdateMethod";
import { finalizeStalledTurns } from "../src/main/finalizeStalledTurns";
import { mergeTurnsById } from "../src/shared/mergeTurnsById";

const tick = () => new Promise(setImmediate);
const chunk = (text: string) => ({ sessionUpdate: "agent_message_chunk", content: { type: "text", text } });

async function readAll(messages: unknown[]): Promise<acp.AnyMessage[]> {
  const readable = new ReadableStream<acp.AnyMessage>({
    start(controller) {
      for (const message of messages) controller.enqueue(message as acp.AnyMessage);
      controller.close();
    },
  });
  const out: acp.AnyMessage[] = [];
  for await (const message of rewriteSubagentUpdates({ readable, writable: new WritableStream() }).readable) {
    out.push(message);
  }
  return out;
}

test("subagent lifecycle notifications are renamed so the SDK schema does not drop them", async () => {
  const spawned = { sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: "Explore" };
  const settled = { sessionUpdate: "subagent_state_update", subagentSessionId: "task-1", state: "completed" };
  const out = await readAll([
    { jsonrpc: "2.0", method: "session/update", params: { sessionId: "root", update: spawned } },
    { jsonrpc: "2.0", method: "session/update", params: { sessionId: "task-1", update: chunk("hi") } },
    { jsonrpc: "2.0", method: "session/update", params: { sessionId: "root", update: settled } },
    { jsonrpc: "2.0", id: 1, result: {} },
  ]);
  expect(out.map((message) => ("method" in message ? message.method : "response"))).toEqual([
    SUBAGENT_UPDATE_METHOD,
    "session/update",
    SUBAGENT_UPDATE_METHOD,
    "response",
  ]);
  expect(out[0]).toMatchObject({ params: { sessionId: "root", update: spawned } });
});

test("subagent notifications are validated before they reach the session", () => {
  expect(parseSubagentNotification({
    sessionId: "root",
    update: { sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: 3, prompt: "Look" },
  })).toEqual({
    sessionId: "root",
    update: { sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: undefined, task: undefined, prompt: "Look" },
  });
  expect(parseSubagentNotification({ sessionId: "root", update: { sessionUpdate: "subagent_state_update", subagentSessionId: "task-1" } })).toBeNull();
  expect(parseSubagentNotification({ sessionId: "root", update: { sessionUpdate: "subagent_spawned" } })).toBeNull();
  expect(parseSubagentNotification(null)).toBeNull();
});

test("only Claude opts into native subagent sessions", async () => {
  const claude = await fixture(true, { agent: "claude" });
  const claudeInit = claude.requests.find((request) => request.method === "initialize")!;
  expect(claudeInit.params).toMatchObject({
    clientCapabilities: {
      _meta: { jetbrains: { air: { version: 1, capabilities: ["nativeSubagentSessions"] } } },
    },
  });
  const codex = await fixture();
  const codexInit = codex.requests.find((request) => request.method === "initialize")!;
  expect((codexInit.params as { clientCapabilities: Record<string, unknown> }).clientCapabilities._meta).toBeUndefined();
});

test("a subagent streams into its own transcript and shows as a row in the parent turn", async () => {
  const f = await fixture(true, { agent: "claude" });
  const turn = f.session.prompt("Research auth");
  await tick();
  f.subagent({
    sessionUpdate: "subagent_spawned",
    subagentSessionId: "task-1",
    name: "Explore auth",
    task: "Find the login flow",
    prompt: "Look at src/auth",
  });
  f.update(chunk("Found "), "task-1");
  f.update(chunk("it"), "task-1");
  f.update({ sessionUpdate: "tool_call", toolCallId: "read-1", title: "Read login.ts", status: "completed" }, "task-1");
  // A subagent can start its own subagent.
  f.subagent({ sessionUpdate: "subagent_spawned", subagentSessionId: "task-2", name: "Check tests" }, "task-1");
  f.subagent({ sessionUpdate: "subagent_state_update", subagentSessionId: "task-2", state: "failed" }, "task-1");
  f.subagent({ sessionUpdate: "subagent_state_update", subagentSessionId: "task-1", state: "completed" });
  f.update(chunk("Done"));
  f.turns[0]!({ stopReason: "end_turn" });
  await turn;

  const root = f.transcripts.at(-1)!;
  expect(root.assistant?.text).toBe("Done");
  expect(root.events.filter((event) => event.role === "subagent")).toEqual([
    expect.objectContaining({
      text: "Explore auth",
      toolTitle: "Find the login flow",
      toolStatus: "completed",
      subagentId: "task-1",
    }),
  ]);
  expect(JSON.stringify(f.transcripts)).not.toMatch(/Found|Read login/);

  const child = f.subagentTurns.filter((entry) => entry.subagentId === "task-1").at(-1)!.turn;
  expect(child.user.text).toBe("Look at src/auth");
  expect(child.assistant?.text).toBe("Found it");
  expect(child.status).toBe("complete");
  expect(child.events).toEqual([
    expect.objectContaining({ role: "tool", toolTitle: "Read login.ts" }),
    expect.objectContaining({ role: "subagent", subagentId: "task-2", toolStatus: "failed" }),
  ]);
  const nested = f.subagentTurns.filter((entry) => entry.subagentId === "task-2").at(-1)!.turn;
  expect(nested.user.text).toBe("Check tests");
  expect(nested.status).toBe("complete");
});

test("a resumed subagent adds a turn to the same transcript and a row in the new parent turn", async () => {
  const f = await fixture(true, { agent: "claude" });
  const first = f.session.prompt("one");
  await tick();
  f.subagent({ sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: "Helper", prompt: "Start" });
  f.subagent({ sessionUpdate: "subagent_state_update", subagentSessionId: "task-1", state: "completed" });
  f.turns[0]!({ stopReason: "end_turn" });
  await first;

  const second = f.session.prompt("two");
  await tick();
  f.subagent({
    sessionUpdate: "subagent_spawned",
    subagentSessionId: "task-1:generation:2",
    name: "Helper",
    prompt: "Keep going",
  });
  f.update(chunk("More"), "task-1:generation:2");

  const turns = new Map(
    f.subagentTurns.filter((entry) => entry.subagentId === "task-1").map((entry) => [entry.turn.id, entry.turn]),
  );
  expect([...turns.values()].map((entry) => [entry.user.text, entry.status])).toEqual([
    ["Start", "complete"],
    ["Keep going", "running"],
  ]);
  const rows = f.transcripts
    .filter((entry) => entry.events.some((event) => event.subagentId === "task-1"))
    .map((entry) => [entry.id, entry.events.find((event) => event.subagentId === "task-1")!.toolStatus]);
  expect(new Map(rows).size).toBe(2);
  expect(rows.at(-1)?.[1]).toBe("running");
  f.turns[1]!({ stopReason: "end_turn" });
  await second;
});

test("disposal settles running subagents and replayed lifecycle is ignored", async () => {
  const f = await fixture(true, { agent: "claude" });
  const turn = f.session.prompt("go");
  await tick();
  f.subagent({ sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: "Long job" });
  await f.session.dispose();
  f.turns[0]!({ stopReason: "cancelled" });
  await turn.catch(() => undefined);

  const row = f.transcripts.flatMap((entry) => entry.events).filter((event) => event.subagentId === "task-1").at(-1);
  expect(row?.toolStatus).toBe("cancelled");
  expect(f.subagentTurns.at(-1)?.turn.status).toBe("stopped");
});

test("restart marks running subagent rows disconnected, and saved turns merge by id", () => {
  const user = { id: "u", role: "user" as const, text: "go", at: 1 };
  const row = { id: "r", role: "subagent" as const, text: "Job", toolStatus: "running", subagentId: "task-1", at: 2 };
  const [turn] = finalizeStalledTurns([
    { id: "t", at: 1, user, assistant: null, events: [row], fileChanges: [], status: "running" as const },
  ]);
  expect(turn!.status).toBe("stopped");
  expect(turn!.events[0]!.toolStatus).toBe("disconnected");

  const saved = [{ id: "a", n: 1 }, { id: "b", n: 1 }];
  expect(mergeTurnsById(saved, [{ id: "b", n: 2 }, { id: "c", n: 1 }])).toEqual([
    { id: "a", n: 1 },
    { id: "b", n: 2 },
    { id: "c", n: 1 },
  ]);
});
