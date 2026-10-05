import { expect, test } from "vitest";
import type { TranscriptItem, TranscriptTurn } from "../src/shared/transcript";
import { shareById } from "../src/renderer/features/sessions/shareById";
import { upsertTurn } from "../src/renderer/features/sessions/upsertTurn";

function item(id: string, text: string): TranscriptItem {
  return { id, role: "tool", text, at: 1 };
}

function turn(id: string, assistantText: string, events: TranscriptItem[]): TranscriptTurn {
  return {
    id,
    at: 1,
    user: { id: `${id}-user`, role: "user", text: "hi", at: 1 },
    assistant: { id: `${id}-assistant`, role: "assistant", text: assistantText, at: 2 },
    events,
    fileChanges: [{ kind: "updated", path: "a.ts", oldText: "a", newText: "b" }],
    status: "running",
  };
}

// IPC delivers a fresh copy of the whole turn on every update.
const clone = <T>(value: T): T => structuredClone(value);

test("upsertTurn keeps unchanged parts of a streamed turn", () => {
  const first = turn("t1", "Hel", [item("e1", "one"), item("e2", "two")]);
  const other = turn("t0", "done", []);
  const list = [other, first];
  const update = clone({ ...first, assistant: { ...first.assistant!, text: "Hello" } });

  const next = upsertTurn(list, update);
  expect(next).not.toBe(list);
  expect(next[0]).toBe(other);
  expect(next[1]).not.toBe(first);
  expect(next[1]!.assistant!.text).toBe("Hello");
  expect(next[1]!.user).toBe(first.user);
  expect(next[1]!.events).toBe(first.events);
  expect(next[1]!.fileChanges).toBe(first.fileChanges);
});

test("upsertTurn returns the same list when the update is identical", () => {
  const first = turn("t1", "Hi", [item("e1", "one")]);
  const list = [first];
  expect(upsertTurn(list, clone(first))).toBe(list);
});

test("upsertTurn replaces only the changed event and appends new turns", () => {
  const first = turn("t1", "Hi", [item("e1", "one"), item("e2", "two")]);
  const update = clone({ ...first, events: [item("e1", "one"), item("e2", "two!")] });
  const next = upsertTurn([first], update);
  expect(next[0]!.events[0]).toBe(first.events[0]);
  expect(next[0]!.events[1]!.text).toBe("two!");

  const added = turn("t2", "", []);
  expect(upsertTurn(next, added)).toEqual([next[0], added]);
});

test("shareById reuses equal entries and the previous list", () => {
  const prev = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
  expect(shareById(prev, clone(prev))).toBe(prev);
  const next = shareById(prev, [{ id: "a", n: 1 }, { id: "b", n: 3 }]);
  expect(next[0]).toBe(prev[0]);
  expect(next[1]).toEqual({ id: "b", n: 3 });
});
