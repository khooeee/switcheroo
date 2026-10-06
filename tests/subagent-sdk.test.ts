import { expect, test } from "vitest";
import * as acp from "@agentclientprotocol/sdk";
import { parseSubagentNotification } from "../src/main/acp/subagents/parseSubagentNotification";
import { rewriteSubagentUpdates } from "../src/main/acp/subagents/rewriteSubagentUpdates";
import type { SubagentUpdate } from "../src/main/acp/subagents/SubagentUpdate";
import { SUBAGENT_UPDATE_METHOD } from "../src/main/acp/subagents/subagentUpdateMethod";

const encoder = new TextEncoder();
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** A real SDK client fed raw NDJSON, as if from an agent process. */
function connectClient(rewrite: boolean) {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const fromAgent = new TransformStream<Uint8Array, Uint8Array>();
  void toAgent.readable.pipeTo(new WritableStream());
  const updates: Array<{ sessionId: string; kind: string }> = [];
  const lifecycle: Array<{ sessionId: string; update: SubagentUpdate }> = [];
  const stream = acp.ndJsonStream(toAgent.writable, fromAgent.readable);
  const errors: unknown[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  const connection = acp
    .client({ name: "test" })
    .onNotification(acp.methods.client.session.update, (ctx) => {
      updates.push({ sessionId: ctx.params.sessionId, kind: ctx.params.update.sessionUpdate });
    })
    .onNotification(SUBAGENT_UPDATE_METHOD, parseSubagentNotification, (ctx) => {
      if (ctx.params) lifecycle.push(ctx.params);
    })
    .connect(rewrite ? rewriteSubagentUpdates(stream) : stream);
  const writer = fromAgent.writable.getWriter();
  const send = (sessionId: string, update: unknown) =>
    writer.write(
      encoder.encode(`${JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update } })}\n`),
    );
  const close = () => {
    console.error = originalError;
    connection.close();
  };
  return { send, updates, lifecycle, errors, close };
}

async function sendLifecycle(client: ReturnType<typeof connectClient>) {
  await client.send("root", {
    sessionUpdate: "subagent_spawned",
    subagentSessionId: "task-1",
    name: "Explore",
    task: "Find it",
    prompt: "Look",
    capabilities: {},
  });
  await client.send("task-1", { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hi" } });
  await client.send("root", { sessionUpdate: "subagent_state_update", subagentSessionId: "task-1", state: "completed" });
  await settle();
}

test("the real SDK drops draft subagent updates unless they are rewritten", async () => {
  const raw = connectClient(false);
  await sendLifecycle(raw);
  raw.close();
  expect(raw.lifecycle).toEqual([]);
  expect(raw.updates).toEqual([{ sessionId: "task-1", kind: "agent_message_chunk" }]);
  expect(raw.errors.length).toBe(2);

  const rewritten = connectClient(true);
  await sendLifecycle(rewritten);
  rewritten.close();
  expect(rewritten.errors).toEqual([]);
  expect(rewritten.updates).toEqual([{ sessionId: "task-1", kind: "agent_message_chunk" }]);
  expect(rewritten.lifecycle).toEqual([
    {
      sessionId: "root",
      update: { sessionUpdate: "subagent_spawned", subagentSessionId: "task-1", name: "Explore", task: "Find it", prompt: "Look" },
    },
    {
      sessionId: "root",
      update: { sessionUpdate: "subagent_state_update", subagentSessionId: "task-1", state: "completed" },
    },
  ]);
});
