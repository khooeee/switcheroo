import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "../src/shared/session";
import type { TranscriptItem, TranscriptTurn } from "../src/shared/transcript";
import { SessionTurn } from "../src/renderer/features/chat/SessionTurn";
import { OpenSubagentIdContext } from "../src/renderer/features/subagents/OpenSubagentIdContext";
import { subagentRows } from "../src/renderer/features/subagents/subagentRows";
import { resolveRightRailView } from "../src/renderer/features/chat/resolveRightRailView";
import { RightRail } from "../src/renderer/features/chat/RightRail";
import { TranscriptMessage } from "../src/renderer/features/chat/TranscriptMessage";
import { subagentKey } from "../src/renderer/features/subagents/subagentKey";

const row = (subagentId: string, toolStatus = "running", at = 1): TranscriptItem => ({
  id: `row-${subagentId}-${at}`,
  role: "subagent",
  text: `Agent ${subagentId}`,
  toolTitle: `Task ${subagentId}`,
  toolStatus,
  subagentId,
  at,
});

const turn = (id: string, events: TranscriptItem[], extra: Partial<TranscriptTurn> = {}): TranscriptTurn => ({
  id,
  at: 1,
  user: { id: `${id}-user`, role: "user", text: "go", at: 1 },
  assistant: null,
  events,
  fileChanges: [],
  status: "running",
  ...extra,
});

const session: Session = {
  id: "s1",
  title: "Chat",
  agent: "claude",
  cwd: "/tmp",
  agentSessionId: "a1",
  status: "running",
  error: null,
  createdAt: 1,
  tabs: [],
  tabsExpanded: true,
};

test("each turn shows its subagent chips between the user message and the final reply", () => {
  const events = [row("a"), row("b", "completed"), row("a", "failed", 2), row("c"), row("d"), row("e")];
  expect(subagentRows(events).map((entry) => [entry.subagentId, entry.toolStatus])).toEqual([
    ["a", "failed"],
    ["b", "completed"],
    ["c", "running"],
    ["d", "running"],
    ["e", "running"],
  ]);
  const done = turn("now", events, {
    status: "complete",
    user: { id: "u", role: "user", text: "Research auth", at: 1 },
    assistant: { id: "r", role: "assistant", text: "Final answer", at: 9 },
  });
  const html = renderToStaticMarkup(
    <OpenSubagentIdContext.Provider value="b">
      <SessionTurn session={{ id: "s1", agent: "claude", cwd: "/tmp" }} turn={done} onOpenRightRail={() => {}} />
    </OpenSubagentIdContext.Provider>,
  );
  const user = html.indexOf("Research auth");
  const chips = html.indexOf('aria-label="Subagents"');
  const reply = html.indexOf("Final answer");
  expect(user).toBeGreaterThanOrEqual(0);
  expect(chips).toBeGreaterThan(user);
  expect(reply).toBeGreaterThan(chips);
  // Like file chips, every subagent gets a chip and the row wraps.
  expect(html.match(/aria-pressed=/g)?.length).toBe(5);
  expect(html).toContain(">Subagents:<");
  expect(html).toMatch(/class="subagent-chip completed active" aria-pressed="true"/);

  const running = renderToStaticMarkup(
    <SessionTurn session={{ id: "s1", agent: "claude", cwd: "/tmp" }} turn={turn("t", [row("x")])} onOpenRightRail={() => {}} />,
  );
  expect(running.indexOf("subagent-spinner")).toBeLessThan(running.indexOf("chat-thinking"));
  const none = renderToStaticMarkup(
    <SessionTurn session={{ id: "s1", agent: "claude", cwd: "/tmp" }} turn={turn("t", [])} onOpenRightRail={() => {}} />,
  );
  expect(none).not.toContain("Subagents");
});

test("a subagent row in Turn Details shows its task and an Open Subagent action", () => {
  const html = renderToStaticMarkup(
    <TranscriptMessage session={{ id: "s1", agent: "claude", cwd: "/tmp" }} item={row("a", "completed")} />,
  );
  expect(html).toContain(">subagent<");
  expect(html).toContain("Task a");
  expect(html).toContain('aria-label="Open Subagent"');
  expect(html).toContain(">completed<");
});

test("the right rail shows a subagent's turns read-only under a subagent heading", () => {
  const subagentTurn = turn("st", [], {
    status: "complete",
    user: { id: "p", role: "user", text: "Look at auth", at: 1 },
    assistant: { id: "r", role: "assistant", text: "Found the login flow", at: 2 },
  });
  const html = renderToStaticMarkup(
    <RightRail
      session={{ ...session, supportsForkAtMessage: true }}
      turn={null}
      subagent={{ id: "a", name: "Explore auth", task: "Find login", state: "completed", turns: [subagentTurn], loading: false }}
      onClose={() => {}}
    />,
  );
  expect(html).toContain('aria-label="Subagent"');
  expect(html).toContain("Subagent · Explore auth");
  expect(html).toContain('<h2 class="subagent-rail-name">Subagent · Explore auth</h2>');
  expect(html).toContain('<div class="subagent-rail-meta">Completed</div>');
  expect(html).not.toContain("Find login");
  expect(html).toContain(">prompt<");
  expect(html).toContain("Found the login flow");
  expect(html).not.toContain('aria-label="Fork"');

  const loading = renderToStaticMarkup(
    <RightRail session={session} turn={null} subagent={{ id: "a", name: "A", turns: [], loading: true }} onClose={() => {}} />,
  );
  expect(loading).toContain("Loading…");
});

test("subagent rail view finds the row in the chat or in a parent subagent's transcript", () => {
  const nestedParent = [turn("st", [row("nested", "failed")])];
  const view = (subagentId: string) =>
    resolveRightRailView({
      selection: { sessionId: "s1", turnId: "", subagentId, focusKey: 1 },
      activeSessionId: "s1",
      activeSession: session,
      transcripts: { s1: [turn("t1", [row("a", "completed")])] },
      switchboardTurns: [],
      openSessions: [session],
      subagentTranscripts: { [subagentKey("s1", "a")]: nestedParent },
      loadingSubagents: new Set([subagentKey("s1", "nested")]),
    });
  expect(view("a")?.subagent).toMatchObject({ name: "Agent a", task: "Task a", state: "completed", turns: nestedParent, loading: false });
  expect(view("nested")?.subagent).toMatchObject({ name: "Agent nested", state: "failed", turns: [], loading: true });
  expect(view("a")?.turn).toBeNull();
});
