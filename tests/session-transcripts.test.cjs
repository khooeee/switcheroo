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
  return {
    dir,
    sessions: path.join(dir, "sessions"),
    transcripts: load(path.join(__dirname, "../src/main/sessionTranscripts.ts"), electron),
    meta: load(path.join(__dirname, "../src/main/sessionMeta.ts"), electron),
  };
}

const turns = [
  {
    id: "t1",
    at: 1,
    user: { id: "a", role: "user", text: "Hi", at: 1 },
    assistant: { id: "b", role: "assistant", text: "Hello\nthere", at: 2 },
    events: [],
    fileChanges: [],
    status: "complete",
  },
];

test("transcript JSON lives at sessions/<id>/transcript.json", async (t) => {
  const { sessions, transcripts } = await fixture(t);
  await transcripts.saveTranscript("session-1", turns);
  const file = path.join(sessions, "session-1", "transcript.json");
  const raw = await fs.readFile(file, "utf8");
  assert.ok(raw.includes('"id":"t1"'));
  assert.equal(JSON.stringify(await transcripts.loadTranscript("session-1")), JSON.stringify(turns));
});

test("meta round-trips beside the transcript", async (t) => {
  const { meta } = await fixture(t);
  await meta.saveSessionMeta("session-1", {
    title: "Demo",
    agent: "codex",
    cwd: "/tmp",
    agentSessionId: null,
    usage: { used: 12_000, size: 272_000 },
  });
  const loaded = await meta.loadSessionMeta("session-1");
  assert.equal(loaded.title, "Demo");
  assert.equal(loaded.usage.used, 12_000);
  assert.equal(loaded.usage.size, 272_000);
});
