import { expect, test, vi } from "vitest";

test("composer drafts persist per session without sharing state", async () => {
  const states: Array<{ value: string; set: (next: string | ((prev: string) => string)) => void }> = [];

  vi.resetModules();
  vi.doMock("react", () => ({
    useState(init: string | (() => string)) {
      const value = typeof init === "function" ? init() : init;
      const entry = {
        value,
        set: null as unknown as (next: string | ((prev: string) => string)) => void,
      };
      entry.set = (next) => {
        entry.value = typeof next === "function" ? next(entry.value) : next;
      };
      states.push(entry);
      return [entry.value, entry.set];
    },
    useEffect(effect: () => void) {
      effect();
    },
  }));

  const { useComposerDraft } = await import("../src/renderer/features/chat/useComposerDraft");

  const run = (sessionId: string) => {
    states.length = 0;
    return useComposerDraft(sessionId);
  };
  const getDraft = () => states[0]?.value;

  let [draft, setDraft] = run("a");
  expect(draft).toBe("");
  setDraft("hello");
  expect(getDraft()).toBe("hello");
  [draft, setDraft] = run("b");
  expect(draft).toBe("");
  setDraft("other");
  [draft] = run("a");
  expect(draft).toBe("hello");
});
