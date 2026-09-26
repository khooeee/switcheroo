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
  const key = `${absolute}::${overrides === undefined ? "" : Object.keys(overrides).join(",")}`;
  // Always reload persist graph against this electron userData dir.
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

function loadSync(absolute, electron, overrides) {
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
    dir,
    target: path.join(dir, "switcheroo-state.json"),
    sessions: path.join(dir, "sessions"),
    store: await loadModule("persist.ts", electron, overrides),
    transcripts: loadSync(path.join(__dirname, "../src/main/sessionTranscripts.ts"), electron, overrides),
    restart: () => {
      cache.clear();
      return loadModule("persist.ts", electron);
    },
  };
}

function state(title = "Saved agent") {
  return {
    version: 3,
    activeTabId: "agent-1",
    tabs: [{ id: "agent-1", title, agentKind: "codex", cwd: "/tmp", sessionId: null }],
  };
}

test("tab notes and notes width round-trip with the rest of saved state", async (t) => {
  const { store, restart } = await fixture(t);
  const snapshot = state();
  snapshot.tabs[0].notes = "scratch\nline";
  snapshot.tabs[0].notesWidth = 320;
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
  const snapshot = state();
  const saves = [];
  for (let i = 0; i < 50; i++) {
    snapshot.tabs[0].title = `Agent ${i}`;
    saves.push(store.saveState(snapshot));
  }
  snapshot.tabs[0].title = "Unsaved change";
  await Promise.all(saves);
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).tabs[0].title, "Agent 49");
});

test("a failed write preserves the previous file and allows a retry", async (t) => {
  let fail = false;
  const { target, store } = await fixture(t, {
    "node:fs/promises": {
      ...fs,
      writeFile: (...args) => fail ? Promise.reject(new Error("Disk full")) : fs.writeFile(...args),
    },
  });
  await store.saveState(state("Original"));
  fail = true;
  await assert.rejects(store.saveState(state("Failed")), /Disk full/);
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).tabs[0].title, "Original");
  fail = false;
  await store.saveState(state("Retried"));
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).tabs[0].title, "Retried");
});

for (const contents of ["{broken", '{"version":4}']) {
  test(`preserve unreadable or unsupported state: ${contents}`, async (t) => {
    const { target, store } = await fixture(t);
    await fs.writeFile(target, contents);
    assert.equal(await store.loadState(), null);
    await assert.rejects(store.saveState(state()), /preserving the existing file/);
    assert.equal(await fs.readFile(target, "utf8"), contents);
  });
}

test("v1 state migrates transcripts and switchboard events to JSONL", async (t) => {
  const { target, sessions, store, transcripts, restart } = await fixture(t);
  const events = [{
    id: "evt-1", tabId: "agent-1", agentKind: "codex", at: 1,
    kind: "message", summary: "Hello", navigable: true,
  }];
  const legacy = {
    version: 1,
    activeTabId: "agent-1",
    tabs: [{ id: "agent-1", title: "Saved agent", agentKind: "codex", cwd: "/tmp", sessionId: null }],
    transcripts: {
      "agent-1": [
        { id: "msg-1", role: "assistant", text: "Hello\nworld", at: 1 },
        { id: "msg-2", role: "user", text: "Hi", at: 2 },
      ],
    },
    masterEvents: events,
  };
  await fs.writeFile(target, JSON.stringify(legacy));
  const loaded = await store.loadState();
  assert.equal(loaded.version, 3);
  assert.equal(loaded.transcripts, undefined);
  assert.equal(loaded.masterEvents, undefined);
  assert.equal(JSON.stringify(await transcripts.loadTranscript("agent-1")), JSON.stringify(legacy.transcripts["agent-1"]));
  const onDisk = await fs.readFile(path.join(sessions, "agent-1.jsonl"), "utf8");
  assert.equal(onDisk.trim().split("\n").length, 2);
  const switchboard = loadSync(path.join(__dirname, "../src/main/switchboardEvents.ts"), { app: { getPath: () => path.dirname(target) } });
  assert.equal(JSON.stringify(await switchboard.loadSwitchboardEvents()), JSON.stringify(events));
  const restarted = await restart();
  assert.equal((await restarted.loadState()).version, 3);
  assert.equal(JSON.parse(await fs.readFile(target, "utf8")).masterEvents, undefined);
});

test("v2 state migrates switchboard events to switchboard.jsonl", async (t) => {
  const { target, store, restart } = await fixture(t);
  const events = [{
    id: "evt-1", tabId: "agent-1", agentKind: "codex", at: 1,
    kind: "tool", summary: "Read file", navigable: true,
  }];
  await fs.writeFile(target, JSON.stringify({
    version: 2,
    activeTabId: "agent-1",
    tabs: [{ id: "agent-1", title: "Saved agent", agentKind: "codex", cwd: "/tmp", sessionId: null }],
    masterEvents: events,
  }));
  const loaded = await store.loadState();
  assert.equal(loaded.version, 3);
  assert.equal(loaded.masterEvents, undefined);
  const switchboard = loadSync(
    path.join(__dirname, "../src/main/switchboardEvents.ts"),
    { app: { getPath: () => path.dirname(target) } },
  );
  assert.equal(JSON.stringify(await switchboard.loadSwitchboardEvents()), JSON.stringify(events));
  assert.equal((await (await restart()).loadState()).version, 3);
});

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
