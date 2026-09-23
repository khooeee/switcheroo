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
  const first = queue.send("Original task");
  const second = queue.send("Use a blue background");
  const third = queue.send("Also add a heading");
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

test("one tab's work does not block another tab", async () => {
  const active = deferred();
  const firstTab = new PromptQueue(() => active.promise);
  const delivered = [];
  const secondTab = new PromptQueue(async (text) => { delivered.push(text); });
  const first = firstTab.send("Long task");
  await secondTab.send("Other tab");
  assert.deepEqual(delivered, ["Other tab"]);
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
  const first = assert.rejects(queue.send("first"), /Agent failed/);
  const second = queue.send("second");
  active.reject(new Error("Agent failed"));
  await Promise.all([first, second]);
  assert.deepEqual(delivered, ["first", "second"]);
});

test("closing a session rejects queued messages and prevents further submissions", async () => {
  const active = deferred();
  const delivered = [];
  const queue = new PromptQueue((text) => { delivered.push(text); return active.promise; });
  const first = queue.send("first");
  const second = assert.rejects(queue.send("second"), /Session closed/);
  queue.dispose();
  await second;
  await assert.rejects(queue.send("third"), /Session closed/);
  active.resolve();
  await first;
  assert.deepEqual(delivered, ["first"]);
});
