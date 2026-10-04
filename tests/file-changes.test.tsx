import { test, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolOutput } from "../src/main/acp/ToolOutput";
import { toolFileChanges } from "../src/main/acp/toolFileChanges";
import { diffLines } from "../src/renderer/features/files/diffLines";
import { FileChanges } from "../src/renderer/features/files/FileChanges";
import { FileDiff } from "../src/renderer/features/files/FileDiff";
import type { TranscriptItem } from "../src/shared/types";

test("partial tool updates retain file content across updates", () => {
  const transcript = new Map<string, TranscriptItem>();
  const replacements: string[] = [];
  const output = new ToolOutput((item, replaceId) => {
    transcript.set(item.id, item);
    if (replaceId) replacements.push(replaceId);
  });
  output.handle({
    toolCallId: "create",
    title: "Write file",
    kind: "edit",
    status: "pending",
    content: [{ type: "diff", path: "/project/new.ts", oldText: null, newText: "hello" }],
  });
  const first = [...transcript.values()][0];
  expect(first.text).toMatch(/^Create .*\(pending\)$/);
  output.handle({ toolCallId: "create", status: "completed", title: null, content: null });
  expect(transcript.size).toBe(1);
  expect(replacements.length).toBe(1);
  const item = [...transcript.values()][0];
  expect(item.text).toBe("Created /project/new.ts");
  expect(item.fileChanges![0].newText).toBe("hello");
  expect(item.toolStatus).toBe("completed");
  expect(item.fileChanges![0].kind).toBe("created");
});

test("updates without an initial tool call still produce a file entry", () => {
  let item!: TranscriptItem;
  const output = new ToolOutput((value) => {
    item = value;
  });
  output.handle({
    toolCallId: "late",
    kind: "edit",
    status: "failed",
    content: [{ type: "diff", path: "a.ts", oldText: "before", newText: "after" }],
  });
  expect(item.text).toBe("Update a.ts (failed)");
  expect(item.toolStatus).toBe("failed");
});

test("read locations are not edits; deletes and moves do not require a diff", () => {
  const locations = [{ path: "file.ts" }];
  expect(toolFileChanges({ toolCallId: "read", kind: "read", locations }).length).toBe(0);
  for (const [kind, expected] of [
    ["delete", "deleted"],
    ["move", "moved"],
    ["edit", "updated"],
  ] as const) {
    const changes = toolFileChanges({ toolCallId: kind, kind, locations });
    expect(changes[0].kind).toBe(expected);
    expect(changes[0].newText).toBeUndefined();
  }
});

test("diffs and locations for the same path are deduplicated and empty files are not deletions", () => {
  const changes = toolFileChanges({
    toolCallId: "edit",
    kind: "edit",
    locations: [{ path: "a" }, { path: "b" }],
    content: [{ type: "diff", path: "a", oldText: "old", newText: "" }],
  });
  expect(changes.length).toBe(2);
  expect(changes[0].kind).toBe("updated");
  expect(changes[0].oldText).toBe("old");
});

test("line diffs reconstruct exact before and after text, including the large-input fallback", () => {
  const cases: Array<[string, string]> = [
    ["", "hello"],
    ["hello", ""],
    ["a\nb\nc", "a\nx\nc"],
    ["a\n", "a"],
    ["same", "same"],
    ["a\na\nb", "b\na\nb"],
    [
      Array.from({ length: 600 }, (_, i) => `old ${i}`).join("\n"),
      Array.from({ length: 600 }, (_, i) => `new ${i}`).join("\n"),
    ],
  ];
  for (const [before, after] of cases) {
    const lines = diffLines(before, after);
    expect(lines.filter((line) => line.kind !== "added").map((line) => line.text).join("\n")).toBe(
      before,
    );
    expect(lines.filter((line) => line.kind !== "removed").map((line) => line.text).join("\n")).toBe(
      after,
    );
  }
  const lines = diffLines("a\nb\nc", "a\nx\nc");
  expect(lines.filter((line) => line.kind === "context").length).toBe(2);
  expect(lines.find((line) => line.kind === "added")!.newLine).toBe(2);
});

test("file entries render relative paths, collapsible diffs, and missing-content notices safely", () => {
  const changes = [
    { path: "/project/new.ts", kind: "created" as const, oldText: null, newText: "<script>" },
    { path: "/project/old.ts", kind: "deleted" as const },
  ];
  const html = renderToStaticMarkup(
    <FileChanges changes={changes} status="completed" cwd="/project" />,
  );
  expect(html).toMatch(/<details/);
  expect(html).toMatch(/Created new.ts/);
  expect(html).toMatch(/Deleted old.ts/);
  expect(html).toMatch(/Diff not provided/);
  expect(html).not.toMatch(/<pre/);
  expect(html).not.toMatch(/Markdown Preview/);
  const diff = renderToStaticMarkup(<FileDiff change={changes[0]} />);
  expect(diff).toMatch(/diff-line added/);
  expect(diff).toMatch(/&lt;script&gt;/);
  expect(diff).not.toMatch(/<script>/);
});

test("markdown edits offer Markdown Preview beside Open in Cursor", () => {
  const changes = [
    {
      path: "/project/README.md",
      kind: "updated" as const,
      oldText: "# Old",
      newText: "# Switcheroo\n\nHello",
    },
    { path: "/project/a.ts", kind: "updated" as const, oldText: "a", newText: "b" },
  ];
  const html = renderToStaticMarkup(
    <FileChanges changes={changes} status="completed" cwd="/project" sessionId="s1" />,
  );
  expect(html).toMatch(/Open in Cursor/);
  expect(html.match(/Markdown Preview/g)?.length).toBe(1);
});

test("finishing a turn settles only unfinished tools and accepts late final updates", () => {
  const transcript = new Map<string, TranscriptItem>();
  const output = new ToolOutput((item) => {
    transcript.set(item.toolCallId!, item);
  });
  output.handle({ toolCallId: "pending", title: "Waiting", status: "pending" });
  output.handle({ toolCallId: "done", title: "Done", status: "completed" });
  output.finish("interrupted");
  expect(transcript.get("pending")!.toolStatus).toBe("interrupted");
  expect(transcript.get("done")!.toolStatus).toBe("completed");
  output.handle({ toolCallId: "pending", status: "completed" });
  expect(transcript.get("pending")!.toolStatus).toBe("completed");
});
