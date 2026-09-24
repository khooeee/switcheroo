const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load() {
  const source = fs.readFileSync(path.join(__dirname, "../src/main/savePastedImage.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require });
  return exports.savePastedImage;
}

test("writes the image under the workspace pastes folder and returns a relative path", async () => {
  const save = load();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "switcheroo-paste-"));
  const dest = await save(cwd, Buffer.from([137, 80, 78, 71]), "image/png");
  assert.match(dest, /^\.switcheroo\/pastes\/paste-.*\.png$/);
  assert.equal(fs.readFileSync(path.join(cwd, dest))[0], 137);
});

test("maps jpeg mime types and rejects empty or huge payloads", async () => {
  const save = load();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "switcheroo-paste-"));
  const dest = await save(cwd, Buffer.from([1, 2, 3]), "image/jpeg");
  assert.match(dest, /\.jpg$/);
  await assert.rejects(save(cwd, Buffer.alloc(0), "image/png"), /empty/);
  await assert.rejects(save(cwd, Buffer.alloc(20 * 1024 * 1024 + 1), "image/png"), /too large/);
  await assert.rejects(save("", Buffer.from([1]), "image/png"), /workspace/);
});
