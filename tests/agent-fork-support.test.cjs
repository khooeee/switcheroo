const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(file) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, process, require: (name) =>
    name.startsWith(".") ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name) });
  return exports;
}

const { AgentForkSupport } = load(path.resolve(__dirname, "../src/main/acp/AgentForkSupport.ts"));

test("fork stays available until an agent kind reports otherwise", () => {
  const support = new AgentForkSupport();
  assert.deepEqual({ ...support.flags("cursor") }, { supportsFork: true, supportsForkAtMessage: false });
  assert.equal(support.record("cursor", false), true);
  assert.equal(support.record("cursor", false), false);
  assert.deepEqual({ ...support.flags("cursor") }, { supportsFork: false, supportsForkAtMessage: false });
});

test("only adapters that read the AIR fork point can fork from a message", () => {
  const support = new AgentForkSupport();
  for (const agent of ["claude", "codex"]) {
    support.record(agent, true);
    assert.equal(support.flags(agent).supportsForkAtMessage, true);
  }
  support.record("pi", true);
  assert.equal(support.flags("pi").supportsForkAtMessage, false);
  support.record("claude", false);
  assert.deepEqual({ ...support.flags("claude") }, { supportsFork: false, supportsForkAtMessage: false });
});
