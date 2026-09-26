const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test, before } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const modules = new Map();
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { exports, console, require(name) {
    if (name.endsWith(".css")) return {};
    if (modules.has(name)) return modules.get(name);
    if (!name.startsWith(".")) return require(name);
    const target = path.resolve(path.dirname(file), name);
    return load(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  } });
  return exports;
}
let MarkdownBody, MasterFeed;
before(async () => {
  modules.set("react-markdown", await import("react-markdown"));
  modules.set("remark-gfm", await import("remark-gfm"));
  MarkdownBody = load("src/renderer/features/markdown/MarkdownBody.tsx").MarkdownBody;
  MasterFeed = load("src/renderer/features/master/MasterFeed.tsx").MasterFeed;
});
const render = (text) => renderToStaticMarkup(React.createElement(MarkdownBody, { text }));

test("renders rich Markdown and scroll containers for code and GFM tables", () => {
  const html = render('# Heading\n\n**bold** and *italic* and `code`\n\n- one\n- two\n\n> quote\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done');
  for (const expected of ['<h1>Heading</h1>', '<strong>bold</strong>', '<em>italic</em>', '<code>code</code>', '<ul>', '<blockquote>', '<pre><code class="language-js">', 'class="markdown-table"><table>', 'type="checkbox"']) {
    assert.ok(html.includes(expected), expected);
  }
});

test("loose lists still render as one list with paragraph-wrapped items", () => {
  const html = render("- one\n\n- two\n\n- three");
  assert.match(html, /<ul>\s*<li>\s*<p>one<\/p>\s*<\/li>\s*<li>\s*<p>two<\/p>/);
  assert.equal((html.match(/<ul>/g) || []).length, 1);
});

test("raw HTML and unsafe links cannot create active content", () => {
  const html = render('<script>alert(1)</script>\n\n[bad](javascript:alert) [local](file:///tmp/a) [relative](./a) [good](https://example.com)\n\n![picture](https://example.com/a.png)');
  assert.doesNotMatch(html, /<script|<img|href="(?:javascript|file|\.\/)/);
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /picture/);
});

test("partial streaming content can be rendered before and after fences close", () => {
  const partial = render('Working **now\n\n```ts\nconst x');
  const complete = render('Working **now**\n\n```ts\nconst x = 1;\n```\n\nDone.');
  assert.match(partial, /const x/);
  assert.match(complete, /<strong>now<\/strong>/);
  assert.match(complete, /<p>Done\.<\/p>/);
});

test("Switchboard opens navigable events from the whole card", () => {
  const events = [
    { id: "m", kind: "message", summary: "**Formatted** [link](https://example.com)", navigable: true },
    { id: "t", kind: "tool", summary: "literal *tool*", navigable: false },
  ].map((event) => ({ ...event, sessionId: "tab", at: 1 }));
  const clicks = [];
  const tree = MasterFeed({ events, sessions: [{ id: "tab", title: "Session" }], onClick: (event) => clicks.push(event.id) });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /<strong>Formatted<\/strong>/);
  assert.match(html, /literal \*tool\*/);
  assert.doesNotMatch(html, /<button[^>]*class="feed-item/);
  assert.match(html, /aria-label="Open Session at this event"/);
  assert.match(html, /aria-label="Copy"/);
  assert.match(html, /class="[^"]*\bnavigable\b/);
  const cards = tree.props.children;
  cards[0].props.onClick({ target: { closest: () => null } });
  assert.deepEqual(clicks, ["m"]);
  assert.equal(cards[1].props.onClick, undefined);
  assert.equal(cards[1].props.role, undefined);
});

test("Switchboard keeps the session title after the tab is closed", () => {
  const events = [{
    id: "m", sessionId: "gone", sessionTitle: "Lucky falcon", at: 1, kind: "user",
    summary: "hi", navigable: true,
  }];
  const html = renderToStaticMarkup(MasterFeed({ events, sessions: [], onClick() {} }));
  assert.match(html, /Lucky falcon/);
  assert.doesNotMatch(html, /Closed session/);
});

test("external links open in the browser and never create Electron windows", () => {
  const opened = [];
  let handler;
  modules.set("electron", { shell: { openExternal: async (url) => { opened.push(url); } } });
  load("src/main/installExternalLinks.ts").installExternalLinks({ setWindowOpenHandler(value) { handler = value; } });
  for (const url of ["https://example.com", "mailto:hello@example.com", "file:///tmp/a", "javascript:alert(1)"]) {
    assert.equal(handler({ url }).action, "deny");
  }
  assert.deepEqual(opened, ["https://example.com", "mailto:hello@example.com"]);
});
