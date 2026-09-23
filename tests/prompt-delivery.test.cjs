const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/main/acp/PromptDelivery.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { PromptDelivery } = loaded;

function fixture(overrides = {}) {
  const prompts = [];
  const steers = [];
  const support = [];
  let detached = 0;
  const delivery = new PromptDelivery({
    isRunning: () => true,
    prompt: async (text) => { prompts.push(text); },
    steer: async (text) => { steers.push(text); return { outcome: "injected" }; },
    onSupport: (value) => support.push(value),
    onDetachedTurn: () => { detached++; },
    ...overrides,
  });
  return { delivery, prompts, steers, support, detached: () => detached };
}

test("only an explicit top-level steering capability enables injection", async () => {
  for (const metadata of [undefined, null, {}, { steering: false },
    { steering: { supported: false } }, { steering: { supported: "true" } },
    { agentCapabilities: { steering: { supported: true } } }]) {
    const f = fixture();
    f.delivery.configure(metadata);
    await f.delivery.send("follow-up");
    assert.deepEqual(f.prompts, ["follow-up"]);
    assert.deepEqual(f.steers, []);
  }
  const f = fixture();
  f.delivery.configure({ steering: { supported: true } });
  await f.delivery.send("follow-up");
  assert.deepEqual(f.steers, ["follow-up"]);
  assert.deepEqual(f.prompts, []);
});

test("an idle session uses a normal prompt even when steering is supported", async () => {
  const f = fixture({ isRunning: () => false });
  f.delivery.configure({ steering: { supported: true } });
  await f.delivery.send("new turn");
  assert.deepEqual(f.prompts, ["new turn"]);
  assert.deepEqual(f.steers, []);
});

test("a running prompt does not block delivery of steering", async () => {
  let finish;
  let running = false;
  const f = fixture({
    isRunning: () => running,
    prompt: () => { running = true; return new Promise((resolve) => { finish = resolve; }); },
  });
  f.delivery.configure({ steering: { supported: true } });
  const original = f.delivery.send("original");
  await new Promise(setImmediate);
  await f.delivery.send("change direction");
  assert.deepEqual(f.steers, ["change direction"]);
  finish();
  await original;
});

test("promptRequired falls back once when the turn finished before injection", async () => {
  const f = fixture({ steer: async () => ({ outcome: "promptRequired" }) });
  f.delivery.configure({ steering: { supported: true } });
  await f.delivery.send("late message");
  assert.deepEqual(f.prompts, ["late message"]);
});

test("startedNewTurn is tracked without sending a duplicate prompt", async () => {
  const f = fixture({ steer: async () => ({ outcome: "startedNewTurn" }) });
  f.delivery.configure({ steering: { supported: true } });
  await f.delivery.send("late message");
  assert.equal(f.detached(), 1);
  assert.deepEqual(f.prompts, []);
});

test("method-not-found disables steering and queues this and subsequent messages", async () => {
  const f = fixture({ steer: async () => { throw { code: -32601 }; } });
  f.delivery.configure({ steering: { supported: true } });
  await f.delivery.send("first");
  await f.delivery.send("second");
  assert.deepEqual(f.prompts, ["first", "second"]);
  assert.deepEqual(f.support, [true, false]);
});

test("ambiguous failures are reported without automatically duplicating messages", async () => {
  for (const steer of [async () => ({ outcome: "failed" }), async () => ({}),
    async () => { throw new Error("Disconnected"); }]) {
    const f = fixture({ steer });
    f.delivery.configure({ steering: { supported: true } });
    await assert.rejects(f.delivery.send("follow-up"));
    assert.deepEqual(f.prompts, []);
  }
});

test("rapid steering messages are delivered in order", async () => {
  const delivered = [];
  let finish;
  const f = fixture({ steer: async (text) => {
    delivered.push(text);
    if (text === "first") await new Promise((resolve) => { finish = resolve; });
    return { outcome: "injected" };
  } });
  f.delivery.configure({ steering: { supported: true } });
  const first = f.delivery.send("first");
  const second = f.delivery.send("second");
  await new Promise(setImmediate);
  assert.deepEqual(delivered, ["first"]);
  finish();
  await Promise.all([first, second]);
  assert.deepEqual(delivered, ["first", "second"]);
});
