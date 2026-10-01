const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/main/acp/WarmSessionPool.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { WarmSessionPool } = loaded;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fakeAcp(startGate) {
  let disposed = false;
  return {
    disposed: () => disposed,
    start() {
      return startGate.promise;
    },
    async dispose() {
      disposed = true;
    },
  };
}

test("ensure is a no-op when agent and cwd already match", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  let opens = 0;
  pool.ensure("claude", "/proj", () => {
    opens += 1;
    return fakeAcp(gate);
  });
  pool.ensure("claude", "/proj", () => {
    opens += 1;
    return fakeAcp(deferred());
  });
  assert.equal(opens, 1);
  gate.resolve();
  await pool.dispose();
});

test("ensure replaces a mismatched warm slot", async () => {
  const pool = new WarmSessionPool();
  const firstGate = deferred();
  const first = fakeAcp(firstGate);
  pool.ensure("claude", "/a", () => first);
  const secondGate = deferred();
  const second = fakeAcp(secondGate);
  pool.ensure("claude", "/b", () => second);
  assert.equal(first.disposed(), true);
  secondGate.resolve();
  const claimed = await pool.claim("claude", "/b");
  assert.equal(claimed, second);
  await pool.dispose();
});

test("claim returns the ready session for a matching key", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  const acp = fakeAcp(gate);
  pool.ensure("cursor", "/repo", () => acp);
  const pending = pool.claim("cursor", "/repo");
  gate.resolve();
  assert.equal(await pending, acp);
  assert.equal(await pool.claim("cursor", "/repo"), null);
});

test("claim returns null for a mismatched key", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  pool.ensure("claude", "/proj", () => fakeAcp(gate));
  assert.equal(await pool.claim("codex", "/proj"), null);
  gate.resolve();
  await pool.dispose();
});

test("claim returns null when warm start fails", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  const acp = fakeAcp(gate);
  pool.ensure("claude", "/proj", () => acp);
  const pending = pool.claim("claude", "/proj");
  gate.reject(new Error("spawn failed"));
  assert.equal(await pending, null);
  assert.equal(acp.disposed(), true);
});

test("dispose clears the warm slot", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  const acp = fakeAcp(gate);
  pool.ensure("claude", "/proj", () => acp);
  gate.resolve();
  await pool.dispose();
  assert.equal(acp.disposed(), true);
  assert.equal(await pool.claim("claude", "/proj"), null);
});

test("ensure skips empty cwd", () => {
  const pool = new WarmSessionPool();
  let opens = 0;
  pool.ensure("claude", "  ", () => {
    opens += 1;
    return fakeAcp(deferred());
  });
  assert.equal(opens, 0);
});
