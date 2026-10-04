import { test, expect } from "vitest";
import { PromptQueue } from "../src/main/acp/PromptQueue";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("follow-ups wait for the current response and run in submission order", async () => {
  const turns = [deferred(), deferred(), deferred()];
  const delivered: string[] = [];
  const queue = new PromptQueue((text) => {
    delivered.push(text);
    return turns[delivered.length - 1].promise;
  });
  const first = queue.send("Original task", "1");
  const second = queue.send("Use a blue background", "2");
  const third = queue.send("Also add a heading", "3");
  expect(delivered).toEqual(["Original task"]);
  turns[0].resolve();
  await first;
  expect(delivered).toEqual(["Original task", "Use a blue background"]);
  turns[1].resolve();
  await second;
  expect(delivered).toEqual(["Original task", "Use a blue background", "Also add a heading"]);
  turns[2].resolve();
  await third;
});

test("one session's work does not block another session", async () => {
  const active = deferred();
  const firstSession = new PromptQueue(() => active.promise);
  const delivered: string[] = [];
  const secondSession = new PromptQueue(async (text) => {
    delivered.push(text);
  });
  const first = firstSession.send("Long task", "a");
  await secondSession.send("Other session", "b");
  expect(delivered).toEqual(["Other session"]);
  active.resolve();
  await first;
});

test("a failed response rejects its caller without losing queued follow-ups", async () => {
  const active = deferred();
  const delivered: string[] = [];
  const queue = new PromptQueue((text) => {
    delivered.push(text);
    return text === "first" ? active.promise : Promise.resolve();
  });
  const first = expect(queue.send("first", "1")).rejects.toThrow(/Agent failed/);
  const second = queue.send("second", "2");
  active.reject(new Error("Agent failed"));
  await Promise.all([first, second]);
  expect(delivered).toEqual(["first", "second"]);
});

test("closing a session rejects queued messages and prevents further submissions", async () => {
  const active = deferred();
  const delivered: string[] = [];
  const queue = new PromptQueue((text) => {
    delivered.push(text);
    return active.promise;
  });
  const first = queue.send("first", "1");
  const second = expect(queue.send("second", "2")).rejects.toThrow(/Session closed/);
  queue.dispose();
  await second;
  await expect(queue.send("third", "3")).rejects.toThrow(/Session closed/);
  active.resolve();
  await first;
  expect(delivered).toEqual(["first"]);
});

test("waiting follow-ups notify hooks until they start or are discarded", async () => {
  const active = deferred();
  const waiting: string[] = [];
  const released: string[] = [];
  const discarded: string[] = [];
  const queue = new PromptQueue(() => active.promise, {
    onWaiting: (id) => waiting.push(id),
    onReleased: (id) => released.push(id),
    onDiscarded: (id) => discarded.push(id),
  });
  const first = queue.send("first", "1");
  const second = queue.send("second", "2");
  expect(waiting).toEqual(["2"]);
  expect(released).toEqual(["1"]);
  queue.dispose();
  await expect(second).rejects.toThrow(/Session closed/);
  active.resolve();
  await first;
  expect(released).toEqual(["1"]);
  expect(discarded).toEqual(["2"]);
});

test("clearPending drops follow-ups without stopping the active prompt", async () => {
  const turns = [deferred(), deferred()];
  const delivered: string[] = [];
  const discarded: string[] = [];
  const queue = new PromptQueue(
    (text) => {
      delivered.push(text);
      return turns[delivered.length - 1].promise;
    },
    { onDiscarded: (id) => discarded.push(id) },
  );
  const first = queue.send("first", "1");
  const second = queue.send("second", "2");
  const third = queue.send("third", "3");
  queue.clearPending();
  await Promise.all([second, third]);
  expect(discarded).toEqual(["2", "3"]);
  expect(delivered).toEqual(["first"]);
  turns[0].resolve();
  await first;
  expect(delivered).toEqual(["first"]);
});
