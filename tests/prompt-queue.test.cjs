const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/main/acp/PromptQueue.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { PromptQueue } = loaded;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("follow-ups wait for the current response and run in submission order", async () => {
  const turns = [deferred(), deferred(), deferred()];
  const delivered = [];
  const queue = new PromptQueue((text) => {
    delivered.push(text);
    return turns[delivered.length - 1].promise;
  });
  const first = queue.send("Original task", "1");
  const second = queue.send("Use a blue background", "2");
  const third = queue.send("Also add a heading", "3");
  assert.deepEqual(delivered, ["Original task"]);
  turns[0].resolve();
  await first;
  assert.deepEqual(delivered, ["Original task", "Use a blue background"]);
  turns[1].resolve();
  await second;
  assert.deepEqual(delivered, ["Original task", "Use a blue background", "Also add a heading"]);
  turns[2].resolve();
  await third;
});

test("one session's work does not block another session", async () => {
  const active = deferred();
  const firstSession = new PromptQueue(() => active.promise);
  const delivered = [];
  const secondSession = new PromptQueue(async (text) => { delivered.push(text); });
  const first = firstSession.send("Long task", "a");
  await secondSession.send("Other session", "b");
  assert.deepEqual(delivered, ["Other session"]);
  active.resolve();
  await first;
});

test("a failed response rejects its caller without losing queued follow-ups", async () => {
  const active = deferred();
  const delivered = [];
  const queue = new PromptQueue((text) => {
    delivered.push(text);
    return text === "first" ? active.promise : Promise.resolve();
  });
  const first = assert.rejects(queue.send("first", "1"), /Agent failed/);
  const second = queue.send("second", "2");
  active.reject(new Error("Agent failed"));
  await Promise.all([first, second]);
  assert.deepEqual(delivered, ["first", "second"]);
});

test("closing a session rejects queued messages and prevents further submissions", async () => {
  const active = deferred();
  const delivered = [];
  const queue = new PromptQueue((text) => { delivered.push(text); return active.promise; });
  const first = queue.send("first", "1");
  const second = assert.rejects(queue.send("second", "2"), /Session closed/);
  queue.dispose();
  await second;
  await assert.rejects(queue.send("third", "3"), /Session closed/);
  active.resolve();
  await first;
  assert.deepEqual(delivered, ["first"]);
});

test("waiting follow-ups notify hooks until they start or are discarded", async () => {
  const active = deferred();
  const waiting = [];
  const released = [];
  const discarded = [];
  const queue = new PromptQueue(
    () => active.promise,
    {
      onWaiting: (id) => waiting.push(id),
      onReleased: (id) => released.push(id),
      onDiscarded: (id) => discarded.push(id),
    },
  );
  const first = queue.send("first", "1");
  const second = queue.send("second", "2");
  assert.deepEqual(waiting, ["2"]);
  assert.deepEqual(released, ["1"]);
  queue.dispose();
  await assert.rejects(second, /Session closed/);
  active.resolve();
  await first;
  assert.deepEqual(released, ["1"]);
  assert.deepEqual(discarded, ["2"]);
});

test("clearPending drops follow-ups without stopping the active prompt", async () => {
  const turns = [deferred(), deferred()];
  const delivered = [];
  const discarded = [];
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
  assert.deepEqual(discarded, ["2", "3"]);
  assert.deepEqual(delivered, ["first"]);
  turns[0].resolve();
  await first;
  assert.deepEqual(delivered, ["first"]);
});
