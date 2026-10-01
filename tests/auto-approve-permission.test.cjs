const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/main/acp/autoApprovePermission.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { autoApprovePermission } = loaded;

test("prefers allow always over allow once", () => {
  assert.equal(
    autoApprovePermission([
      { optionId: "once", kind: "allow_once" },
      { optionId: "always", kind: "allow_always" },
    ]),
    "always",
  );
});

test("falls back to allow once", () => {
  assert.equal(
    autoApprovePermission([{ optionId: "once", kind: "allow_once" }]),
    "once",
  );
});

test("does not select reject options", () => {
  assert.equal(
    autoApprovePermission([
      { optionId: "reject", kind: "reject_once" },
      { optionId: "never", kind: "reject_always" },
    ]),
    null,
  );
});
