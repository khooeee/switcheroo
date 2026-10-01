const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function fixture({ exists = true, failures = [], gitToplevel = null } = {}) {
  const calls = [];
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/main/openInCursor.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, { exports, process: { platform: "darwin" }, require: (name) => {
    if (name === "node:fs/promises") return { stat: async () => ({ isFile: () => exists }) };
    if (name === "node:os") return { homedir: () => "/Users/test" };
    if (name === "node:child_process") return { execFile(command, args, options, callback) {
      if (command === "git") {
        if (gitToplevel) callback(null, `${gitToplevel}\n`);
        else callback(Object.assign(new Error("not a git repo"), { code: 128 }));
        return;
      }
      calls.push({ command, args: Array.from(args), options });
      callback(failures[calls.length - 1] ?? null);
    } };
    return require(name);
  } });
  return { open: exports.openInCursor, calls };
}

test("opens the exact workspace and file using arguments, including spaces and shell characters", async () => {
  const f = fixture();
  await f.open("/project folder", "src/a $(echo nope).ts");
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].args, ["/project folder", "--goto", "/project folder/src/a $(echo nope).ts"]);
  assert.equal(f.calls[0].options.shell, undefined);
});

test("falls back to an installed Cursor launcher when GUI PATH omits it", async () => {
  const f = fixture({ failures: [{ code: "ENOENT" }] });
  await f.open("/project", "/project/file.ts");
  assert.equal(f.calls[1].command, "/Users/test/.local/bin/cursor");
});

test("rejects missing and invalid paths before launching", async () => {
  const missing = fixture({ exists: false });
  await assert.rejects(missing.open("/project", "deleted.ts"), /no longer exists/);
  assert.equal(missing.calls.length, 0);
  const f = fixture();
  for (const file of ["", "bad\0path"]) {
    await assert.rejects(f.open("/project", file));
  }
  assert.equal(f.calls.length, 0);
});

test("opens files outside the project without a workspace folder", async () => {
  const f = fixture();
  await f.open("/project", "../outside.ts");
  assert.deepEqual(f.calls[0].args, ["--goto", "/outside.ts"]);
  await f.open("/project", "/project-other/file.ts");
  assert.deepEqual(f.calls[1].args, ["--goto", "/project-other/file.ts"]);
});

test("opens files in another git worktree using that worktree root", async () => {
  const f = fixture({ gitToplevel: "/worktrees/switcheroo/feature" });
  await f.open("/project", "/worktrees/switcheroo/feature/src/a.ts");
  assert.deepEqual(f.calls[0].args, [
    "/worktrees/switcheroo/feature",
    "--goto",
    "/worktrees/switcheroo/feature/src/a.ts",
  ]);
});

test("reports missing Cursor and launch failures instead of silently succeeding", async () => {
  const missing = fixture({ failures: Array(6).fill({ code: "ENOENT" }) });
  await assert.rejects(missing.open("/project", "a.ts"), /Cursor was not found/);
  const failed = fixture({ failures: [{ code: 1 }] });
  await assert.rejects(failed.open("/project", "a.ts"), /could not open/);
  assert.equal(failed.calls.length, 1);
});
