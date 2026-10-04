import { test, expect } from "vitest";
import { WarmSessionPool } from "../src/main/acp/WarmSessionPool";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fakeAcp(startGate: ReturnType<typeof deferred>) {
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
  expect(opens).toBe(1);
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
  expect(first.disposed()).toBe(true);
  secondGate.resolve();
  const claimed = await pool.claim("claude", "/b");
  expect(claimed).toBe(second);
  await pool.dispose();
});

test("claim returns the ready session for a matching key", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  const acp = fakeAcp(gate);
  pool.ensure("cursor", "/repo", () => acp);
  const pending = pool.claim("cursor", "/repo");
  gate.resolve();
  expect(await pending).toBe(acp);
  expect(await pool.claim("cursor", "/repo")).toBe(null);
});

test("claim returns null for a mismatched key", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  pool.ensure("claude", "/proj", () => fakeAcp(gate));
  expect(await pool.claim("codex", "/proj")).toBe(null);
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
  expect(await pending).toBe(null);
  expect(acp.disposed()).toBe(true);
});

test("dispose clears the warm slot", async () => {
  const pool = new WarmSessionPool();
  const gate = deferred();
  const acp = fakeAcp(gate);
  pool.ensure("claude", "/proj", () => acp);
  gate.resolve();
  await pool.dispose();
  expect(acp.disposed()).toBe(true);
  expect(await pool.claim("claude", "/proj")).toBe(null);
});

test("ensure skips empty cwd", () => {
  const pool = new WarmSessionPool();
  let opens = 0;
  pool.ensure("claude", "  ", () => {
    opens += 1;
    return fakeAcp(deferred());
  });
  expect(opens).toBe(0);
});
