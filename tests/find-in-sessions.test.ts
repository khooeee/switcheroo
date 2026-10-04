import { test, expect } from "vitest";
import { findInSessionSources, matchSnippet } from "../src/main/findInSessionSources";
import { groupFindHits } from "../src/renderer/features/find/groupFindHits";

function turn(id: string, userText: string, assistantText: string | null, at: number) {
  return {
    id,
    at,
    user: { id: `${id}-u`, role: "user" as const, text: userText, at },
    assistant: assistantText
      ? { id: `${id}-a`, role: "assistant" as const, text: assistantText, at: at + 1 }
      : null,
    events: [],
    fileChanges: [],
    status: "complete" as const,
  };
}

test("empty query returns no hits", () => {
  expect(findInSessionSources([{
    sessionId: "s1",
    title: "Demo",
    agent: "claude",
    turns: [turn("t1", "hello world", null, 1)],
  }], "  ")).toHaveLength(0);
});

test("hits sorted by timestamp descending across sessions", () => {
  const hits = findInSessionSources([
    {
      sessionId: "old",
      title: "Old",
      agent: "claude",
      turns: [turn("t1", "alpha", "find ME please", 1)],
    },
    {
      sessionId: "new",
      title: "New",
      agent: "cursor",
      turns: [turn("t2", "Find me too", null, 5)],
    },
  ], "FIND ME");
  expect(hits.map((hit) => hit.eventId).join(",")).toBe("t2-u,t1-a");
  expect(hits[0].turnId).toBe("t2");
  expect(hits[0].at).toBe(5);
});

test("groupFindHits keeps session order from newest match", () => {
  const groups = groupFindHits([
    { sessionId: "b", turnId: "tb", eventId: "2", title: "B", agent: "claude", role: "user", snippet: "x", at: 20 },
    { sessionId: "a", turnId: "ta", eventId: "1", title: "A", agent: "claude", role: "user", snippet: "x", at: 15 },
    { sessionId: "b", turnId: "tb", eventId: "3", title: "B", agent: "claude", role: "assistant", snippet: "y", at: 5 },
  ]);
  expect(groups.map((group) => group.sessionId).join(",")).toBe("b,a");
  expect(groups[0].hits.map((hit) => hit.eventId).join(",")).toBe("2,3");
  expect(groups[0].title).toBe("B");
});

test("optional limit still applies when provided", () => {
  const turns = Array.from({ length: 5 }, (_, i) => turn(`t${i}`, "needle", null, i));
  const hits = findInSessionSources([{
    sessionId: "s",
    title: "T",
    agent: "codex",
    turns,
  }], "needle", 2);
  expect(hits).toHaveLength(2);
  expect(hits.map((hit) => hit.at).join(",")).toBe("4,3");
});

test("uncapped by default", () => {
  const turns = Array.from({ length: 5 }, (_, i) => turn(`t${i}`, "needle", null, i));
  expect(findInSessionSources([{
    sessionId: "s",
    title: "T",
    agent: "codex",
    turns,
  }], "needle")).toHaveLength(5);
});

test("snippet centers on the match", () => {
  const text = `${"x".repeat(60)}UNIQUE${"y".repeat(60)}`;
  const snippet = matchSnippet(text, "unique");
  expect(snippet).toMatch(/UNIQUE/);
  expect(snippet).toMatch(/^…/);
  expect(snippet).toMatch(/…$/);
});
