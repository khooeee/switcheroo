const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/renderer/features/notes/notesMarkdownSegments.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded });
const { notesMarkdownSegments } = loaded;

const join = (segments) => segments.map((s) => s.text).join("");
const kinds = (segments) => segments.map((s) => `${s.kind}:${s.text}`);

test("keeps every source character including markers", () => {
  const text = "# Title\n**bold** and *italic* and `code`\n~~bye~~\n```\nblock\n```";
  const segments = notesMarkdownSegments(text);
  assert.equal(join(segments), text);
});

test("styles bold italics code heading and strike without dropping markers", () => {
  const segments = notesMarkdownSegments("**a** *b* `c`\n## Head\n~~z~~");
  assert.equal(
    kinds(segments).join("|"),
    ["bold:**a**", "text: ", "italic:*b*", "text: ", "code:`c`", "text:\n", "heading:## Head", "text:\n", "strike:~~z~~"].join("|"),
  );
});

test("fenced code blocks keep fences and content", () => {
  const text = "before\n```js\nconst x = 1;\n```\nafter";
  const segments = notesMarkdownSegments(text);
  assert.equal(join(segments), text);
  assert.equal(segments[1].kind, "codeBlock");
  assert.equal(segments[1].text, "```js\nconst x = 1;\n```");
});

test("unclosed markers stay plain text", () => {
  assert.equal(kinds(notesMarkdownSegments("**open and *also")).join("|"), "text:**open and *also");
});
