import { test, expect } from "vitest";
import { PromptDelivery } from "../src/main/acp/PromptDelivery";

function fixture(overrides: Record<string, unknown> = {}) {
  const prompts: string[] = [];
  const steers: string[] = [];
  const support: boolean[] = [];
  const delivery = new PromptDelivery({
    isRunning: () => true,
    prompt: async (text: string) => {
      prompts.push(text);
    },
    steer: async (text: string) => {
      steers.push(text);
      return { outcome: "injected" as const };
    },
    onSupport: (value: boolean) => support.push(value),
    ...overrides,
  });
  return { delivery, prompts, steers, support };
}

async function send(delivery: PromptDelivery, text: string, id = "msg") {
  return delivery.send(text, id);
}

test("enqueue keeps prompt mode deferred until startPrompt", async () => {
  let finish!: () => void;
  const prompts: string[] = [];
  const delivery = new PromptDelivery({
    isRunning: () => false,
    prompt: (text) => {
      prompts.push(text);
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
    steer: async () => ({ outcome: "injected" as const }),
    onSupport: () => {},
  });
  const decision = await delivery.enqueue("hello", "msg-1");
  expect(decision.mode).toBe("prompt");
  expect(prompts).toEqual([]);
  const completion = delivery.startPrompt("hello", "msg-1");
  let done = false;
  void completion.then(() => {
    done = true;
  });
  await new Promise(setImmediate);
  expect(done).toBe(false);
  finish();
  await completion;
  expect(done).toBe(true);
  expect(prompts).toEqual(["hello"]);
});

test("send still starts a deferred prompt", async () => {
  const f = fixture({ isRunning: () => false });
  await send(f.delivery, "hello");
  expect(f.prompts).toEqual(["hello"]);
});

test("steering requires an explicit supported flag under _meta.steering", async () => {
  for (const metadata of [
    undefined,
    null,
    {},
    { steering: false },
    { steering: { supported: false } },
    { steering: { supported: "true" } },
    { agentCapabilities: { steering: { supported: true } } },
  ]) {
    const f = fixture();
    f.delivery.configure(metadata);
    await send(f.delivery, "follow-up");
    expect(f.prompts).toEqual(["follow-up"]);
    expect(f.steers).toEqual([]);
  }
  const f = fixture();
  f.delivery.configure({ steering: { supported: true } });
  await send(f.delivery, "follow-up");
  expect(f.steers).toEqual(["follow-up"]);
  expect(f.prompts).toEqual([]);
});

test("an idle session uses a normal prompt even when steering is supported", async () => {
  const f = fixture({ isRunning: () => false });
  f.delivery.configure({ steering: { supported: true } });
  await send(f.delivery, "new turn");
  expect(f.prompts).toEqual(["new turn"]);
  expect(f.steers).toEqual([]);
});

test("a running prompt does not block delivery of steering", async () => {
  let finish!: () => void;
  let running = false;
  const f = fixture({
    isRunning: () => running,
    prompt: () => {
      running = true;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  });
  f.delivery.configure({ steering: { supported: true } });
  const original = send(f.delivery, "original");
  await new Promise(setImmediate);
  await send(f.delivery, "change direction");
  expect(f.steers).toEqual(["change direction"]);
  finish();
  await original;
});

test("promptRequired falls back once when the turn finished before injection", async () => {
  const f = fixture({ steer: async () => ({ outcome: "promptRequired" }) });
  f.delivery.configure({ steering: { supported: true } });
  await send(f.delivery, "late message");
  expect(f.prompts).toEqual(["late message"]);
});

test("startedNewTurn is tracked without sending a duplicate prompt", async () => {
  const f = fixture({ steer: async () => ({ outcome: "startedNewTurn" }) });
  f.delivery.configure({ steering: { supported: true } });
  const result = await f.delivery.enqueue("late message", "msg");
  expect(result.mode).toBe("startedNewTurn");
  expect(f.prompts).toEqual([]);
});

test("method-not-found disables steering and queues this and subsequent messages", async () => {
  const f = fixture({
    steer: async () => {
      throw { code: -32601 };
    },
  });
  f.delivery.configure({ steering: { supported: true } });
  await send(f.delivery, "first");
  await send(f.delivery, "second");
  expect(f.prompts).toEqual(["first", "second"]);
  expect(f.support).toEqual([true, false]);
});

test("ambiguous failures are reported without automatically duplicating messages", async () => {
  for (const steer of [
    async () => ({ outcome: "failed" }),
    async () => ({}),
    async () => {
      throw new Error("Disconnected");
    },
  ]) {
    const f = fixture({ steer });
    f.delivery.configure({ steering: { supported: true } });
    await expect(send(f.delivery, "follow-up")).rejects.toThrow();
    expect(f.prompts).toEqual([]);
  }
});

test("rapid steering messages are delivered in order", async () => {
  const delivered: string[] = [];
  let finish!: () => void;
  const f = fixture({
    steer: async (text: string) => {
      delivered.push(text);
      if (text === "first")
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      return { outcome: "injected" as const };
    },
  });
  f.delivery.configure({ steering: { supported: true } });
  const first = send(f.delivery, "first");
  const second = send(f.delivery, "second");
  await new Promise(setImmediate);
  expect(delivered).toEqual(["first"]);
  finish();
  await Promise.all([first, second]);
  expect(delivered).toEqual(["first", "second"]);
});
