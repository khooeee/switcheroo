const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load() {
  const exports = {};
  const source = fs.readFileSync(
    path.join(__dirname, "../src/main/acp/spawnAgentProcess.ts"),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports,
    process,
    require: (name) => require(name),
  });
  return exports;
}

test("spawnAgentProcess rejects missing command", async () => {
  const { spawnAgentProcess } = load();
  await assert.rejects(
    () => spawnAgentProcess("/nonexistent/switcheroo-agent-binary", [], process.cwd()),
    /Command not found/,
  );
});

test("spawnAgentProcess rejects missing working directory", async () => {
  const { spawnAgentProcess } = load();
  const cwd = path.join(os.tmpdir(), `switcheroo-missing-cwd-${process.pid}`);
  await assert.rejects(
    () => spawnAgentProcess(process.execPath, ["-e", ""], cwd),
    /Working directory does not exist/,
  );
});
