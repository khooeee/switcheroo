const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(tempRoot) {
  const source = fs.readFileSync(path.join(__dirname, "../src/main/savePastedImage.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => (name === "node:os" ? { tmpdir: () => tempRoot } : require(name)),
  });
  return exports.savePastedImage;
}

test("writes the image under a global temp folder and returns an absolute path", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "switcheroo-paste-"));
  const save = load(tempRoot);
  const dest = await save(Buffer.from([137, 80, 78, 71]), "image/png");
  assert.equal(dest, path.join(tempRoot, "switcheroo", "pastes", path.basename(dest)));
  assert.match(path.basename(dest), /^paste-.*\.png$/);
  assert.equal(fs.readFileSync(dest)[0], 137);
});

test("maps jpeg mime types and rejects empty or huge payloads", async () => {
  const save = load(fs.mkdtempSync(path.join(os.tmpdir(), "switcheroo-paste-")));
  const dest = await save(Buffer.from([1, 2, 3]), "image/jpeg");
  assert.match(dest, /\.jpg$/);
  await assert.rejects(save(Buffer.alloc(0), "image/png"), /empty/);
  await assert.rejects(save(Buffer.alloc(20 * 1024 * 1024 + 1), "image/png"), /too large/);
});
