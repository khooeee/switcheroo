import { expect, test, vi } from "vitest";
import type { Session } from "../src/shared/session";
import type { TranscriptTurn } from "../src/shared/transcript";

/** Minimal hook runner: slots persist across renders by call order; effects run inline. */
function mockReact() {
  const slots: unknown[] = [];
  const cleanups = new Map<number, () => void>();
  const deps = new Map<number, unknown[]>();
  let index = 0;
  const effect = (fn: () => void | (() => void), list?: unknown[]) => {
    const key = index++;
    const prev = deps.get(key);
    if (prev && list && prev.length === list.length && prev.every((v, i) => Object.is(v, list[i]))) return;
    cleanups.get(key)?.();
    deps.set(key, list ?? []);
    const cleanup = fn();
    if (cleanup) cleanups.set(key, cleanup);
  };
  vi.doMock("react", () => ({
    useState(init: unknown) {
      const key = index++;
      if (!(key in slots)) slots[key] = typeof init === "function" ? (init as () => unknown)() : init;
      const set = (next: unknown) => {
        slots[key] = typeof next === "function" ? (next as (prev: unknown) => unknown)(slots[key]) : next;
      };
      return [slots[key], set];
    },
    useRef(init: unknown) {
      const key = index++;
      if (!(key in slots)) slots[key] = { current: init };
      return slots[key];
    },
    useCallback(fn: unknown) {
      index++;
      return fn;
    },
    useMemo(fn: () => unknown) {
      index++;
      return fn();
    },
    useEffect: effect,
    useLayoutEffect: effect,
  }));
  return <T>(run: () => T): T => {
    index = 0;
    return run();
  };
}

const session = (id: string): Session => ({
  id,
  title: id,
  agent: "claude",
  cwd: "/tmp",
  agentSessionId: id,
  status: "idle",
  error: null,
  createdAt: 1,
  tabs: [],
  tabsExpanded: true,
});

const turn = (id: string): TranscriptTurn => ({
  id,
  at: 1,
  user: { id: `${id}-user`, role: "user", text: "go", at: 1 },
  assistant: null,
  events: [],
  fileChanges: [],
  status: "complete",
});

test("each tab keeps its own right rail selection across tab switches", async () => {
  vi.resetModules();
  const render = mockReact();
  const { useRightRail } = await import("../src/renderer/features/chat/useRightRail");
  const sessions = [session("a"), session("b")];
  const transcripts = { a: [turn("ta")], b: [turn("tb")] };
  const show = (tabId: string | null) =>
    render(() =>
      useRightRail({
        tabId,
        activeSession: sessions.find((entry) => entry.id === tabId) ?? null,
        transcripts,
        switchboardTurns: [],
        openSessions: sessions,
        subagentTranscripts: {},
        loadingSubagents: new Set(),
      }),
    );

  show("a").toggleSessionRightRail("ta", "ta-user");
  const opened = show("a").rightRailView;
  expect(opened?.turn?.id).toBe("ta");

  expect(show("b").rightRailView).toBeNull();
  show("b").toggleSessionRightRail("tb", "tb-user");
  expect(show("b").rightRailView?.turn?.id).toBe("tb");
  // Terminal tabs have no rail, and visiting one leaves the others alone.
  expect(show(null).rightRailView).toBeNull();

  const back = show("a").rightRailView;
  expect(back?.turn?.id).toBe("ta");
  // Same selection, so the rail restores its scroll instead of flashing the event again.
  expect(back?.focusKey).toBe(opened?.focusKey);

  show("a").closeRightRail();
  expect(show("a").rightRailView).toBeNull();
  expect(show("b").rightRailView?.turn?.id).toBe("tb");
});

test("each tab's rail keeps its own width; new tabs start at the last dragged width", async () => {
  vi.resetModules();
  let settings = { rightRailWidth: 320 };
  let cssWidth = "";
  vi.doMock("../src/renderer/features/settings/appSettingsCache", () => ({
    getAppSettingsCache: () => settings,
    patchAppSettings: async (patch: typeof settings) => {
      settings = { ...settings, ...patch };
      return settings;
    },
  }));
  vi.doMock("../src/renderer/features/layout/readCssPx", () => ({ readCssPx: () => 0 }));
  vi.doMock("../src/renderer/features/sessions/reclampRailWidth", () => ({ reclampRailWidth: () => 0 }));
  vi.stubGlobal("document", {
    documentElement: { style: { setProperty: (_name: string, value: string) => (cssWidth = value) } },
  });
  vi.stubGlobal("window", { innerWidth: 1440 });
  const { rightRailWidth } = await import("../src/renderer/features/chat/rightRailWidth");

  rightRailWidth.show("a");
  expect(cssWidth).toBe("320px");
  rightRailWidth.hide();
  rightRailWidth.show("b");
  rightRailWidth.apply(500, true);
  rightRailWidth.hide();
  expect(cssWidth).toBe("0px");

  rightRailWidth.show("a");
  expect(cssWidth).toBe("320px");
  rightRailWidth.apply(400, true);
  rightRailWidth.show("b");
  expect(cssWidth).toBe("500px");
  rightRailWidth.show("c");
  expect(cssWidth).toBe("400px");
  vi.unstubAllGlobals();
});

test("switching back to a tab restores its rail scroll offset", async () => {
  vi.resetModules();
  const render = mockReact();
  const { useRightRailScroll } = await import("../src/renderer/features/chat/useRightRailScroll");
  let onScroll = () => {};
  const element = {
    scrollTop: 0,
    addEventListener: (_type: string, listener: () => void) => (onScroll = listener),
    removeEventListener: () => {},
  };
  const ref = { current: element as unknown as HTMLElement };
  const scrollTo = (top: number) => {
    element.scrollTop = top;
    onScroll();
  };

  render(() => useRightRailScroll("a", 1, ref));
  scrollTo(300);
  render(() => useRightRailScroll("b", 2, ref));
  scrollTo(80);
  render(() => useRightRailScroll("a", 1, ref));
  expect(element.scrollTop).toBe(300);
  render(() => useRightRailScroll("b", 2, ref));
  expect(element.scrollTop).toBe(80);
  // A new selection in the tab keeps the current offset (flashing its event scrolls to it).
  render(() => useRightRailScroll("b", 3, ref));
  expect(element.scrollTop).toBe(80);
});
