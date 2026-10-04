import { test, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "../src/renderer/features/markdown/MarkdownBody";
import { GithubMarkdown } from "../src/renderer/features/files/GithubMarkdown";
import { SwitchboardFeed } from "../src/renderer/features/switchboard/SwitchboardFeed";
import { isMarkdownFile, markdownPreviewText } from "../src/renderer/features/files/isMarkdownFile";

const opened: string[] = [];

vi.mock("electron", () => ({
  shell: {
    openExternal: async (url: string) => {
      opened.push(url);
    },
  },
}));

const render = (text: string) => renderToStaticMarkup(<MarkdownBody text={text} />);

test("detects markdown paths and prefers newText for preview content", () => {
  expect(isMarkdownFile("README.md")).toBe(true);
  expect(isMarkdownFile("docs/Note.MARKDOWN")).toBe(true);
  expect(isMarkdownFile("a.ts")).toBe(false);
  expect(
    markdownPreviewText({ path: "README.md", kind: "updated", oldText: "old", newText: "new" }),
  ).toBe("new");
  expect(markdownPreviewText({ path: "gone.md", kind: "deleted", oldText: "was" })).toBe("was");
  expect(markdownPreviewText({ path: "a.ts", kind: "updated", newText: "x" })).toBeNull();
});

test("GitHub markdown preview uses Primer class and GFM without remark-breaks", () => {
  const html = renderToStaticMarkup(
    <GithubMarkdown text={"# Heading\n\n**bold**\n\n| A | B |\n| - | - |\n| 1 | 2 |"} theme="light" />,
  );
  expect(html).toMatch(/class="github-markdown-preview"/);
  expect(html).toContain("<h1>Heading</h1>");
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain("<table>");
});

test("renders rich Markdown and scroll containers for code and GFM tables", () => {
  const html = render(
    "# Heading\n\n**bold** and *italic* and `code`\n\n- one\n- two\n\n> quote\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done",
  );
  for (const expected of [
    "<h1>Heading</h1>",
    "<strong>bold</strong>",
    "<em>italic</em>",
    "<code>code</code>",
    "<ul>",
    "<blockquote>",
    '<pre><code class="language-js">',
    'class="markdown-table"><table>',
    'type="checkbox"',
  ]) {
    expect(html).toContain(expected);
  }
});

test("loose lists still render as one list with paragraph-wrapped items", () => {
  const html = render("- one\n\n- two\n\n- three");
  expect(html).toMatch(/<ul>\s*<li>\s*<p>one<\/p>\s*<\/li>\s*<li>\s*<p>two<\/p>/);
  expect((html.match(/<ul>/g) || []).length).toBe(1);
});

test("raw HTML and unsafe links cannot create active content", () => {
  const html = render(
    '<script>alert(1)</script>\n\n[bad](javascript:alert) [local](file:///tmp/a) [relative](./a) [good](https://example.com)\n\n![picture](https://example.com/a.png)',
  );
  expect(html).not.toMatch(/<script|<img|href="(?:javascript|file|\.\/)/);
  expect(html).toMatch(/href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
  expect(html).toMatch(/picture/);
});

test("partial streaming content can be rendered before and after fences close", () => {
  const partial = render("Working **now\n\n```ts\nconst x");
  const complete = render("Working **now**\n\n```ts\nconst x = 1;\n```\n\nDone.");
  expect(partial).toMatch(/const x/);
  expect(complete).toMatch(/<strong>now<\/strong>/);
  expect(complete).toMatch(/<p>Done\.<\/p>/);
});

test("Switchboard renders turn cards with session titles", () => {
  const turns = [
    {
      id: "t1",
      at: 1,
      user: { id: "u1", role: "user" as const, text: "**Formatted** hi", at: 1 },
      assistant: { id: "a1", role: "assistant" as const, text: "literal *tool*", at: 2 },
      events: [],
      fileChanges: [],
      status: "complete" as const,
      sessionId: "session-1",
      agent: "codex" as const,
      navigable: true,
    },
  ];
  const html = renderToStaticMarkup(
    <SwitchboardFeed
      turns={turns}
      sessions={[
        {
          id: "session-1",
          title: "Session",
          agent: "codex",
          cwd: "/tmp",
          agentSessionId: null,
          status: "ready",
          error: null,
          createdAt: 1,
        },
      ]}
      onOpenRightRail={() => {}}
      onClick={() => {}}
    />,
  );
  expect(html).toMatch(/Session/);
  expect(html).toMatch(/class="[^"]*\bnavigable\b/);
  expect(html).toMatch(/aria-label="Copy as Markdown"/);
});

test("Switchboard keeps the session title after the session is closed", () => {
  const turns = [
    {
      id: "t1",
      at: 1,
      user: { id: "u1", role: "user" as const, text: "hi", at: 1 },
      assistant: null,
      events: [],
      fileChanges: [],
      status: "complete" as const,
      sessionId: "gone",
      sessionTitle: "Lucky falcon",
      agent: "codex" as const,
      navigable: true,
    },
  ];
  const html = renderToStaticMarkup(
    <SwitchboardFeed
      turns={turns}
      sessions={[]}
      onOpenRightRail={() => {}}
      onClick={() => {}}
    />,
  );
  expect(html).toMatch(/Lucky falcon/);
  expect(html).not.toMatch(/Closed session/);
});

test("external links open in the browser and never create Electron windows", async () => {
  opened.length = 0;
  const { installExternalLinks } = await import("../src/main/installExternalLinks");
  let handler!: (details: { url: string }) => { action: "deny" };
  installExternalLinks({
    setWindowOpenHandler(value) {
      handler = value;
    },
  } as Parameters<typeof installExternalLinks>[0]);
  for (const url of [
    "https://example.com",
    "mailto:hello@example.com",
    "file:///tmp/a",
    "javascript:alert(1)",
  ]) {
    expect(handler({ url }).action).toBe("deny");
  }
  expect(opened).toEqual(["https://example.com", "mailto:hello@example.com"]);
});
