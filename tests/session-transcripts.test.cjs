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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-sessions-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const electron = { app: { getPath: () => dir } };
  const store = load(path.join(__dirname, "../src/main/sessionTranscripts.ts"), electron);
  return {
    dir,
    sessions: path.join(dir, "sessions"),
    store,
  };
}

const items = [
  { id: "a", role: "user", text: "Hi", at: 1 },
  { id: "b", role: "assistant", text: "Hello\nthere", at: 2 },
];

test("transcript JSONL round-trips and uses sessions/<tabId>.jsonl", async (t) => {
  const { sessions, store } = await fixture(t);
  await store.saveTranscript("tab-1", items);
  const file = path.join(sessions, "tab-1.jsonl");
  const raw = await fs.readFile(file, "utf8");
  assert.equal(raw.trim().split("\n").length, 2);
  assert.equal(JSON.stringify(await store.loadTranscript("tab-1")), JSON.stringify(items));
});

test("deleteTranscript removes the file and load returns empty", async (t) => {
  const { sessions, store } = await fixture(t);
  await store.saveTranscript("tab-1", items);
  await store.deleteTranscript("tab-1");
  await assert.rejects(fs.access(path.join(sessions, "tab-1.jsonl")));
  assert.equal(JSON.stringify(await store.loadTranscript("tab-1")), "[]");
});

test("removeOrphanTranscripts keeps only listed tab ids", async (t) => {
  const { store } = await fixture(t);
  await store.saveTranscript("keep", items);
  await store.saveTranscript("drop", items);
  await store.removeOrphanTranscripts(new Set(["keep"]));
  assert.equal(JSON.stringify(await store.loadTranscript("keep")), JSON.stringify(items));
  assert.equal(JSON.stringify(await store.loadTranscript("drop")), "[]");
});
