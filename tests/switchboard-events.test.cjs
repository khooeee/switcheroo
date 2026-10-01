const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const cache = new Map();

function load(absolute, electron) {
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
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(absolute), name);
      const resolved = require("node:fs").existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.js`;
      return load(resolved, electron);
    },
  });
  return exports;
}

async function fixture(t) {
  cache.clear();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-switchboard-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const electron = { app: { getPath: () => dir } };
  return {
    dir,
    path: path.join(dir, "switchboard.jsonl"),
    store: load(path.join(__dirname, "../src/main/switchboardEvents.ts"), electron),
  };
}

const turns = [
  {
    id: "t1",
    at: 1,
    user: { id: "u1", role: "user", text: "Hi", at: 1 },
    assistant: { id: "a1", role: "assistant", text: "Hello", at: 2 },
    events: [],
    fileChanges: [],
    status: "complete",
    sessionId: "s1",
    agent: "codex",
    navigable: true,
  },
];

test("switchboard JSONL round-trips at switchboard.jsonl", async (t) => {
  const { path: file, store } = await fixture(t);
  await store.saveSwitchboardTurns(turns);
  const raw = await fs.readFile(file, "utf8");
  const lines = raw.trimEnd().split("\n");
  assert.equal(lines.length, turns.length);
  assert.equal(JSON.stringify(JSON.parse(lines[0])), JSON.stringify(turns[0]));
  assert.equal(JSON.stringify(await store.loadSwitchboardTurns()), JSON.stringify(turns));
});

test("empty switchboard save writes an empty file", async (t) => {
  const { path: file, store } = await fixture(t);
  await store.saveSwitchboardTurns(turns);
  await store.saveSwitchboardTurns([]);
  assert.equal(await fs.readFile(file, "utf8"), "");
  assert.equal(JSON.stringify(await store.loadSwitchboardTurns()), "[]");
});
