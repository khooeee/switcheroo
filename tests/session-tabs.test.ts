import { expect, test } from "vitest";
import { activeTabAfterChildClose } from "../src/main/tabs/activeTabAfterChildClose";
import { createTerminalTab } from "../src/main/tabs/createTerminalTab";
import { moveTabBetweenLists } from "../src/main/tabs/moveTabBetweenLists";
import { nextTerminalTitle } from "../src/main/tabs/nextTerminalTitle";
import { reorderTabInList } from "../src/main/tabs/reorderTabInList";
import { childMatchesFilter } from "../src/shared/tabNav/childMatchesFilter";
import { groupMatchesFilter } from "../src/shared/tabNav/groupMatchesFilter";
import { visibleChildren } from "../src/shared/tabNav/visibleChildren";
import { visibleTabOrder } from "../src/shared/tabNav/visibleTabOrder";
import type { Session, SessionTab } from "../src/shared/session";
import { SWITCHBOARD_ID } from "../src/shared/switchboardId";

test("nextTerminalTitle increments past Terminal", () => {
  expect(nextTerminalTitle([])).toBe("Terminal");
  expect(nextTerminalTitle([createTerminalTab("/x", [])])).toBe("Terminal 2");
});

test("reorder and move tabs preserve tab identity", () => {
  const a = createTerminalTab("/a", []);
  const b = createTerminalTab("/b", [a]);
  const c = createTerminalTab("/c", [a, b]);
  const reordered = reorderTabInList([a, b, c], b.tabId, 0);
  expect(reordered?.map((tab) => tab.tabId)).toEqual([b.tabId, a.tabId, c.tabId]);
  const moved = moveTabBetweenLists([a, b], [c], a.tabId, 1);
  expect(moved?.from.map((tab) => tab.tabId)).toEqual([b.tabId]);
  expect(moved?.to.map((tab) => tab.tabId)).toEqual([c.tabId, a.tabId]);
});

test("activeTabAfterChildClose prefers next, then previous, then parent", () => {
  const a = { tabId: "a", kind: "terminal" as const, title: "A", cwd: "/" };
  const b = { tabId: "b", kind: "terminal" as const, title: "B", cwd: "/" };
  const c = { tabId: "c", kind: "terminal" as const, title: "C", cwd: "/" };
  expect(activeTabAfterChildClose([b, c], 0, "parent")).toBe("b");
  expect(activeTabAfterChildClose([a, c], 1, "parent")).toBe("c");
  expect(activeTabAfterChildClose([a, b], 2, "parent")).toBe("b");
  expect(activeTabAfterChildClose([], 0, "parent")).toBe("parent");
});

function session(partial: Partial<Session> & Pick<Session, "id" | "title">): Session {
  return {
    agent: "claude",
    cwd: "/repo",
    agentSessionId: null,
    status: "ready",
    error: null,
    createdAt: 0,
    tabs: [],
    tabsExpanded: true,
    ...partial,
  };
}

test("filter shows matching child even when collapsed; expanded shows all", () => {
  const term: SessionTab = { tabId: "t1", kind: "terminal", title: "build", cwd: "/repo" };
  const other: SessionTab = { tabId: "t2", kind: "terminal", title: "logs", cwd: "/repo" };
  const collapsed = session({
    id: "s1",
    title: "Chat",
    tabs: [term, other],
    tabsExpanded: false,
  });
  expect(groupMatchesFilter(collapsed, "build")).toBe(true);
  expect(visibleChildren(collapsed, "build").map((tab) => tab.tabId)).toEqual(["t1"]);
  const expanded = { ...collapsed, tabsExpanded: true };
  expect(visibleChildren(expanded, "build").map((tab) => tab.tabId)).toEqual(["t1", "t2"]);
  expect(childMatchesFilter(term, "build")).toBe(true);
});

test("visibleTabOrder includes Switchboard, parents, and visible children", () => {
  const child: SessionTab = { tabId: "term-1", kind: "terminal", title: "Terminal", cwd: "/" };
  const order = visibleTabOrder(
    [],
    [session({ id: "s1", title: "One", tabs: [child], tabsExpanded: true })],
    "",
  );
  expect(order).toEqual([SWITCHBOARD_ID, "s1", "term-1"]);
});
