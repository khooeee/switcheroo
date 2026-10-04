import { test, expect } from "vitest";
import { GlobalEventBus } from "../src/main/events";

function turn(id: string, sessionId: string, at: number, text = id) {
  return {
    id,
    at,
    user: { id: `${id}-u`, role: "user" as const, text, at },
    assistant: null,
    events: [],
    fileChanges: [],
    status: "complete" as const,
    sessionId,
    agent: "codex" as const,
    navigable: true,
  };
}

test("append with the same id updates in place and keeps the original at", () => {
  const bus = new GlobalEventBus();
  const first = bus.append(turn("e1", "t1", 100, "Hi"));
  const second = bus.append({
    ...turn("e1", "t1", 999, "Hi there"),
    sessionTitle: "Demo",
    assistant: { id: "a1", role: "assistant", text: "Hi there", at: 999 },
  });
  expect(bus.list().length).toBe(1);
  expect(second.at).toBe(100);
  expect(second.assistant!.text).toBe("Hi there");
  expect(second.sessionTitle).toBe("Demo");
  expect(first.at).toBe(100);
});

test("removeSession drops every turn for that session", () => {
  const bus = new GlobalEventBus();
  bus.append(turn("e1", "a", 1, "A"));
  bus.append(turn("e2", "b", 2, "B"));
  bus.append(turn("e3", "a", 3, "A2"));
  bus.removeSession("a");
  expect(bus.list().length).toBe(1);
  expect(bus.list()[0].id).toBe("e2");
});

test("removeOlderThan drops turns strictly before the cutoff", () => {
  const bus = new GlobalEventBus();
  for (const [id, at] of [
    ["a", 10],
    ["b", 20],
    ["c", 30],
  ] as const) {
    bus.append(turn(id, "s", at));
  }
  expect(bus.removeOlderThan(20)).toBe(1);
  expect(bus.list().map((e) => e.id).join(",")).toBe("b,c");
});
