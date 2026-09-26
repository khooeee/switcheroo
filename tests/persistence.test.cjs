const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const cache = new Map();

async function loadModule(file, electron, overrides = {}) {
  const absolute = path.isAbsolute(file) ? file : path.join(__dirname, "../src/main", file);
  const exports = {};
  const source = await fs.readFile(absolute, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    process,
    require: (name) => {
      if (name === "electron") return electron;
      if (overrides[name]) return overrides[name];
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(absolute), name);
      const resolved = require("node:fs").existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.js`;
      return loadSync(resolved, electron, overrides);
    },
  });
  return exports;
}

function loadSync(absolute, electron, overrides = {}) {
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const source = require("node:fs").readFileSync(absolute, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    process,
    require: (name) => {
      if (name === "electron") return electron;
      if (overrides[name]) return overrides[name];
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(absolute), name);
      const resolved = require("node:fs").existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.js`;
      return loadSync(resolved, electron, overrides);
    },
  });
  return exports;
}

async function fixture(t, overrides) {
  cache.clear();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-persistence-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const electron = { app: { getPath: () => dir } };
  return {
    target: path.join(dir, "switcheroo-state.json"),
    store: await loadModule("persist.ts", electron, overrides),
    restart: () => {
      cache.clear();
      return loadModule("persist.ts", electron);
    },
  };
}

function state() {
  return {
    version: 1,
    activeSessionId: "agent-1",
    sessions: [{ id: "agent-1", title: "Saved agent" }],
  };
}

test("active tab and id list round-trip", async (t) => {
  const { store, restart } = await fixture(t);
  const snapshot = state();
  await store.saveState(snapshot);
  const restarted = await restart();
  assert.equal(JSON.stringify(await restarted.loadState()), JSON.stringify(snapshot));
});

for (const initial of [null, "", "  \n"]) {
  test(`save and restore after restart with initial file ${JSON.stringify(initial)}`, async (t) => {
    const { target, store, restart } = await fixture(t);
    if (initial !== null) await fs.writeFile(target, initial);
    assert.equal(await store.loadState(), null);
    await store.saveState(state());
    const restarted = await restart();
    assert.equal(JSON.stringify(await restarted.loadState()), JSON.stringify(state()));
  });
}

test("overlapping saves finish in order and capture the state at call time", async (t) => {
  const { target, store } = await fixture(t);
  const saves = [];
  for (let i = 0; i < 50; i++) {
    saves.push(store.saveState({
      version: 1,
      activeSessionId: `agent-${i}`,
      sessions: [{ id: "agent-1", title: "Saved agent" }],
    }));
  }
  await Promise.all(saves);
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).activeSessionId, "agent-49");
});

test("a failed write preserves the previous file and allows a retry", async (t) => {
  let fail = false;
  const { target, store } = await fixture(t, {
    "node:fs/promises": {
      ...fs,
      writeFile: (...args) => fail ? Promise.reject(new Error("Disk full")) : fs.writeFile(...args),
    },
  });
  await store.saveState(state());
  fail = true;
  await assert.rejects(store.saveState({ ...state(), activeSessionId: "master" }), /Disk full/);
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).activeSessionId, "agent-1");
  fail = false;
  await store.saveState({ ...state(), activeSessionId: "master" });
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).activeSessionId, "master");
});

for (const contents of ["{broken", '{"version":2}']) {
  test(`preserve unreadable or unsupported state: ${contents}`, async (t) => {
    const { target, store } = await fixture(t);
    await fs.writeFile(target, contents);
    assert.equal(await store.loadState(), null);
    await assert.rejects(store.saveState(state()), /preserving the existing file/);
    assert.equal(await fs.readFile(target, "utf8"), contents);
  });
}

async function quitFixture(save) {
  let handler;
  let prevented = 0;
  let exited = 0;
  const errors = [];
  const app = {
    on: (_name, callback) => { handler = callback; },
    quit: () => {
      let blocked = false;
      handler({ preventDefault: () => { blocked = true; prevented++; } });
      if (!blocked) exited++;
    },
  };
  cache.clear();
  const { installQuitHandler } = await loadModule("installQuitHandler.ts", {
    app,
    dialog: { showErrorBox: (...args) => errors.push(args) },
  });
  installQuitHandler(save);
  return { app, errors, prevented: () => prevented, exited: () => exited };
}

test("quitting waits for saving and ignores repeated quit attempts while saving", async () => {
  let finish;
  let calls = 0;
  const pending = new Promise((resolve) => { finish = resolve; });
  const fixture = await quitFixture(() => { calls++; return pending; });
  fixture.app.quit();
  fixture.app.quit();
  assert.equal(fixture.exited(), 0);
  assert.equal(fixture.prevented(), 2);
  assert.equal(calls, 1);
  finish();
  await new Promise(setImmediate);
  assert.equal(fixture.exited(), 1);
});

test("a save failure keeps the app open and lets the user retry quitting", async () => {
  let fail = true;
  const fixture = await quitFixture(() => fail ? Promise.reject(new Error("Disk full")) : Promise.resolve());
  fixture.app.quit();
  await new Promise(setImmediate);
  assert.equal(fixture.exited(), 0);
  assert.match(fixture.errors[0][1], /Disk full/);
  fail = false;
  fixture.app.quit();
  await new Promise(setImmediate);
  assert.equal(fixture.exited(), 1);
});
