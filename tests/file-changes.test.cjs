const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { exports, require: (name) => {
    if (name.endsWith(".css")) return {};
    if (!name.startsWith(".")) return require(name);
    const target = path.resolve(path.dirname(file), name);
    return load(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  } });
  return exports;
}
const { ToolOutput } = load("src/main/acp/ToolOutput.ts");
const { toolFileChanges } = load("src/main/acp/toolFileChanges.ts");
const { diffLines } = load("src/renderer/features/files/diffLines.ts");
const { FileChanges } = load("src/renderer/features/files/FileChanges.tsx");
const { FileDiff } = load("src/renderer/features/files/FileDiff.tsx");

test("partial tool updates retain file content across updates", () => {
  const transcript = new Map();
  const replacements = [];
  const output = new ToolOutput((item, replaceId) => {
    transcript.set(item.id, item);
    if (replaceId) replacements.push(replaceId);
  });
  output.handle({ toolCallId: "create", title: "Write file", kind: "edit", status: "pending",
    content: [{ type: "diff", path: "/project/new.ts", oldText: null, newText: "hello" }] });
  const first = [...transcript.values()][0];
  assert.match(first.text, /^Create .*\(pending\)$/);
  output.handle({ toolCallId: "create", status: "completed", title: null, content: null });
  assert.equal(transcript.size, 1);
  assert.equal(replacements.length, 1);
  const item = [...transcript.values()][0];
  assert.equal(item.text, "Created /project/new.ts");
  assert.equal(item.fileChanges[0].newText, "hello");
  assert.equal(item.toolStatus, "completed");
  assert.equal(item.fileChanges[0].kind, "created");
});

test("updates without an initial tool call still produce a file entry", () => {
  let item;
  const output = new ToolOutput((value) => { item = value; });
  output.handle({ toolCallId: "late", kind: "edit", status: "failed",
    content: [{ type: "diff", path: "a.ts", oldText: "before", newText: "after" }] });
  assert.equal(item.text, "Update a.ts (failed)");
  assert.equal(item.toolStatus, "failed");
});

test("read locations are not edits; deletes and moves do not require a diff", () => {
  const locations = [{ path: "file.ts" }];
  assert.equal(toolFileChanges({ toolCallId: "read", kind: "read", locations }).length, 0);
  for (const [kind, expected] of [["delete", "deleted"], ["move", "moved"], ["edit", "updated"]]) {
    const changes = toolFileChanges({ toolCallId: kind, kind, locations });
    assert.equal(changes[0].kind, expected);
    assert.equal(changes[0].newText, undefined);
  }
});

test("diffs and locations for the same path are deduplicated and empty files are not deletions", () => {
  const changes = toolFileChanges({ toolCallId: "edit", kind: "edit",
    locations: [{ path: "a" }, { path: "b" }],
    content: [{ type: "diff", path: "a", oldText: "old", newText: "" }] });
  assert.equal(changes.length, 2);
  assert.equal(changes[0].kind, "updated");
  assert.equal(changes[0].oldText, "old");
});

test("line diffs reconstruct exact before and after text, including the large-input fallback", () => {
  const cases = [
    ["", "hello"], ["hello", ""], ["a\nb\nc", "a\nx\nc"], ["a\n", "a"],
    ["same", "same"], ["a\na\nb", "b\na\nb"],
    [Array.from({ length: 600 }, (_, i) => `old ${i}`).join("\n"),
      Array.from({ length: 600 }, (_, i) => `new ${i}`).join("\n")],
  ];
  for (const [before, after] of cases) {
    const lines = diffLines(before, after);
    assert.equal(lines.filter((line) => line.kind !== "added").map((line) => line.text).join("\n"), before);
    assert.equal(lines.filter((line) => line.kind !== "removed").map((line) => line.text).join("\n"), after);
  }
  const lines = diffLines("a\nb\nc", "a\nx\nc");
  assert.equal(lines.filter((line) => line.kind === "context").length, 2);
  assert.equal(lines.find((line) => line.kind === "added").newLine, 2);
});

test("file entries render relative paths, collapsible diffs, and missing-content notices safely", () => {
  const changes = [{ path: "/project/new.ts", kind: "created", oldText: null, newText: "<script>" },
    { path: "/project/old.ts", kind: "deleted" }];
  const html = renderToStaticMarkup(React.createElement(FileChanges, { changes, status: "completed", cwd: "/project" }));
  assert.match(html, /<details/);
  assert.match(html, /Created new.ts/);
  assert.match(html, /Deleted old.ts/);
  assert.match(html, /Diff not provided/);
  assert.doesNotMatch(html, /<pre/);
  const diff = renderToStaticMarkup(React.createElement(FileDiff, { change: changes[0] }));
  assert.match(diff, /diff-line added/);
  assert.match(diff, /&lt;script&gt;/);
  assert.doesNotMatch(diff, /<script>/);
});

test("finishing a turn settles only unfinished tools and accepts late final updates", () => {
  const transcript = new Map();
  const output = new ToolOutput((item) => transcript.set(item.toolCallId, item));
  output.handle({ toolCallId: "pending", title: "Waiting", status: "pending" });
  output.handle({ toolCallId: "done", title: "Done", status: "completed" });
  output.finish("interrupted");
  assert.equal(transcript.get("pending").toolStatus, "interrupted");
  assert.equal(transcript.get("done").toolStatus, "completed");
  output.handle({ toolCallId: "pending", status: "completed" });
  assert.equal(transcript.get("pending").toolStatus, "completed");
});
