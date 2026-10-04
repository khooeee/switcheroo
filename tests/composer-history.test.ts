import { test, expect } from "vitest";
import {
  applyComposerHistoryEdit,
  applyComposerHistoryKey,
  emptyComposerHistory,
} from "../src/renderer/features/chat/composerHistory";
import { userPromptHistory } from "../src/renderer/features/chat/userPromptHistory";

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

test("userPromptHistory is newest-first non-empty user texts", () => {
  expect(
    plain(
      userPromptHistory([
        {
          id: "t1",
          at: 1,
          status: "complete",
          events: [],
          fileChanges: [],
          user: { id: "1", role: "user", text: "first", at: 1 },
          assistant: { id: "2", role: "assistant", text: "ok", at: 2 },
        },
        {
          id: "t2",
          at: 3,
          status: "complete",
          events: [],
          fileChanges: [],
          user: { id: "3", role: "user", text: "  ", at: 3 },
          assistant: null,
        },
        {
          id: "t3",
          at: 4,
          status: "complete",
          events: [],
          fileChanges: [],
          user: { id: "4", role: "user", text: "second\n", at: 4 },
          assistant: null,
        },
      ]),
    ),
  ).toEqual(["second", "first"]);
});

test("composer history cycles from empty and returns to empty", () => {
  const history = ["newest", "older"];
  let state = emptyComposerHistory;

  let step = applyComposerHistoryKey(state, "ArrowUp", "", history);
  expect(plain(step)).toEqual({ state: { index: 0, locked: false }, draft: "newest" });
  state = step!.state;

  step = applyComposerHistoryKey(state, "ArrowUp", "newest", history);
  expect(plain(step)).toEqual({ state: { index: 1, locked: false }, draft: "older" });
  state = step!.state;

  step = applyComposerHistoryKey(state, "ArrowUp", "older", history);
  expect(plain(step)).toEqual({ state: { index: 1, locked: false }, draft: "older" });

  step = applyComposerHistoryKey(state, "ArrowDown", "older", history);
  expect(plain(step)).toEqual({ state: { index: 0, locked: false }, draft: "newest" });
  state = step!.state;

  step = applyComposerHistoryKey(state, "ArrowDown", "newest", history);
  expect(plain(step)).toEqual({ state: { index: null, locked: false }, draft: "" });
});

test("composer history ignores Up when draft is non-empty and not browsing", () => {
  expect(applyComposerHistoryKey(emptyComposerHistory, "ArrowUp", "typed", ["past"])).toBe(null);
});

test("editing while browsing locks until draft is cleared", () => {
  let state = { index: 0 as number | null, locked: false };
  state = applyComposerHistoryEdit(state, "newest edited");
  expect(plain(state)).toEqual({ index: null, locked: true });
  expect(applyComposerHistoryKey(state, "ArrowUp", "newest edited", ["past"])).toBe(null);
  state = applyComposerHistoryEdit(state, "");
  expect(plain(state)).toEqual({ index: null, locked: false });
  expect(plain(applyComposerHistoryKey(state, "ArrowUp", "", ["past"]))).toEqual({
    state: { index: 0, locked: false },
    draft: "past",
  });
});
