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
    notes: load(path.join(__dirname, "../src/main/sessionNotes.ts"), electron),
  };
}

const items = [
  { id: "a", role: "user", text: "Hi", at: 1 },
  { id: "b", role: "assistant", text: "Hello\nthere", at: 2 },
];

test("transcript JSONL lives at sessions/<id>/transcript.jsonl", async (t) => {
  const { sessions, transcripts } = await fixture(t);
  await transcripts.saveTranscript("tab-1", items);
  const file = path.join(sessions, "tab-1", "transcript.jsonl");
  const raw = await fs.readFile(file, "utf8");
  assert.equal(raw.trim().split("\n").length, 2);
  assert.equal(JSON.stringify(await transcripts.loadTranscript("tab-1")), JSON.stringify(items));
});

test("meta and notes round-trip beside the transcript", async (t) => {
  const { sessions, meta, notes } = await fixture(t);
  await meta.saveSessionMeta("tab-1", {
    title: "Demo", agentKind: "codex", cwd: "/tmp", sessionId: null, notesWidth: 280,
  });
  await notes.saveSessionNotes("tab-1", "# hello\n");
  assert.equal((await meta.loadSessionMeta("tab-1")).title, "Demo");
  assert.equal(await notes.loadSessionNotes("tab-1"), "# hello\n");
  assert.equal(await fs.readFile(path.join(sessions, "tab-1", "notes.md"), "utf8"), "# hello\n");
});

test("deleteSessionFolder removes the whole session directory", async (t) => {
  const { sessions, transcripts, meta } = await fixture(t);
  await transcripts.saveTranscript("tab-1", items);
  await meta.saveSessionMeta("tab-1", {
    title: "Demo", agentKind: "codex", cwd: "/tmp", sessionId: null,
  });
  await meta.deleteSessionFolder("tab-1");
  await assert.rejects(fs.access(path.join(sessions, "tab-1")));
  assert.equal(JSON.stringify(await transcripts.loadTranscript("tab-1")), "[]");
});
