const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require });
  return exports;
}

const { nextForkTitle } = load("src/shared/nextForkTitle.ts");

test("nextForkTitle picks the lowest unused fork number", () => {
  assert.equal(nextForkTitle("Alpha", []), "Alpha (fork #1)");
  assert.equal(nextForkTitle("Alpha", ["Alpha (fork #1)"]), "Alpha (fork #2)");
  assert.equal(
    nextForkTitle("Alpha", ["Alpha (fork #1)", "Alpha (fork #3)"]),
    "Alpha (fork #2)",
  );
});

test("nextForkTitle reuses an existing fork suffix and increments from there", () => {
  assert.equal(
    nextForkTitle("Alpha (fork #1)", ["Alpha (fork #1)"]),
    "Alpha (fork #2)",
  );
  assert.equal(
    nextForkTitle("Alpha (fork #2)", ["Alpha (fork #1)", "Alpha (fork #2)"]),
    "Alpha (fork #3)",
  );
  assert.equal(
    nextForkTitle("Alpha (fork #2)", ["Alpha (fork #2)", "Alpha (fork #3)"]),
    "Alpha (fork #4)",
  );
  assert.equal(
    nextForkTitle("Alpha (fork #1)", ["Alpha (fork #1)", "Alpha (fork #2)", "Alpha (fork #4)"]),
    "Alpha (fork #3)",
  );
});
