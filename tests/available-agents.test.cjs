const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(presets) {
  const cache = new Map();
  function loadFile(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports,
      process,
      require(name) {
        if (name === "./presets") return { AGENT_PRESETS: presets };
        if (name.startsWith(".")) return loadFile(path.resolve(path.dirname(file), `${name}.ts`));
        return require(name);
      },
    });
    return exports;
  }
  return loadFile(path.join(__dirname, "../src/main/acp/availableAgents.ts"));
}

test("availableAgents keeps agents whose command and adapter resolve", () => {
  const { availableAgents } = load({
    claude: { command: process.execPath, args: [__filename] },
    codex: { command: "node", args: [] },
    cursor: { command: "/nonexistent/switcheroo-agent", args: ["acp"] },
    pi: { command: "switcheroo-missing-cli-on-path", args: [] },
  });
  assert.deepEqual([...availableAgents()], ["claude", "codex"]);
});

test("availableAgents drops agents whose adapter needs a CLI that is not installed", () => {
  const { availableAgents } = load({
    codex: { command: process.execPath, args: [], requiredCommand: "node" },
    pi: { command: process.execPath, args: [], requiredCommand: "switcheroo-missing-pi" },
  });
  assert.deepEqual([...availableAgents()], ["codex"]);
});

test("availableAgents drops agents whose adapter package is missing", () => {
  const { availableAgents } = load({
    claude: {
      command: process.execPath,
      get args() {
        throw new Error("ACP adapter not installed: x");
      },
    },
    codex: { command: process.execPath, args: ["/nonexistent/adapter/index.js"] },
  });
  assert.deepEqual([...availableAgents()], []);
});
