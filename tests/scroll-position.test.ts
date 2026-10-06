import { expect, test } from "vitest";
import { pinScrollToBottom } from "../src/renderer/features/sessions/pinScrollToBottom";
import { trackScrollPosition, type ScrollPosition } from "../src/renderer/features/sessions/trackScrollPosition";

function fixture() {
  const observers: Array<{ callback: () => void; active: boolean }> = [];
  class Observer {
    active = false;
    constructor(public callback: () => void) {
      observers.push(this);
    }
    observe() {
      this.active = true;
    }
    disconnect() {
      this.active = false;
    }
  }
  // @ts-expect-error test doubles
  globalThis.ResizeObserver = Observer;
  // @ts-expect-error test doubles
  globalThis.MutationObserver = Observer;

  let top = 0;
  let scroll: (() => void) | undefined;
  /** Messages laid out in content coordinates; rects are relative to a viewport at y = 0. */
  let items: Array<{ id: string; top: number; height: number }> = [];
  const element = {
    scrollHeight: 1000,
    clientHeight: 200,
    clientWidth: 600,
    children: [{}],
    getBoundingClientRect: () => ({ top: 0 }),
    querySelectorAll: () =>
      items.map((item) => ({
        dataset: { eventId: item.id },
        getBoundingClientRect: () => ({
          top: item.top - top,
          bottom: item.top + item.height - top,
          height: item.height,
        }),
      })),
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight));
    },
    addEventListener(_event: string, listener: () => void) {
      scroll = listener;
    },
    removeEventListener() {
      scroll = undefined;
    },
  } as unknown as HTMLElement;

  return {
    element,
    track: (position: ScrollPosition) => trackScrollPosition(element, position),
    /** Lay out equal-height messages, as if the text wrapped to `height` at `width`. */
    layout(ids: string[], height: number, width: number) {
      items = ids.map((id, index) => ({ id, top: index * height, height }));
      Object.assign(element, { scrollHeight: ids.length * height, clientWidth: width });
    },
    scrollTo(value: number) {
      (element as unknown as { scrollTop: number }).scrollTop = value;
      scroll?.();
    },
    flushScroll() {
      scroll?.();
    },
    resize() {
      observers.filter((o) => o.active).forEach((o) => o.callback());
    },
    activeObservers: () => observers.filter((o) => o.active).length,
  };
}

test("new sessions start at the bottom and follow streaming growth and viewport resizing", () => {
  const f = fixture();
  f.track({ top: 0, pinned: true });
  expect(f.element.scrollTop).toBe(800);
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1400;
  f.resize();
  expect(f.element.scrollTop).toBe(1200);
  (f.element as unknown as { clientHeight: number }).clientHeight = 300;
  f.resize();
  expect(f.element.scrollTop).toBe(1100);
});

test("scrolling up stops following; returning to the bottom resumes it", () => {
  const f = fixture();
  const position = { top: 0, pinned: true };
  f.track(position);
  f.scrollTo(250);
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1400;
  f.resize();
  expect(f.element.scrollTop).toBe(250);
  expect(position.pinned).toBe(false);
  f.scrollTo(1200);
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1600;
  f.resize();
  expect(f.element.scrollTop).toBe(1400);
  expect(position.pinned).toBe(true);
});

test("switching sessions restores independent positions, including after background growth", () => {
  const f = fixture();
  const first = { top: 0, pinned: true };
  const second = { top: 0, pinned: true };
  let stop = f.track(first);
  f.scrollTo(300);
  stop();
  stop = f.track(second);
  expect(f.element.scrollTop).toBe(800);
  stop();
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1800;
  stop = f.track(first);
  f.flushScroll();
  expect(f.element.scrollTop).toBe(300);
  expect(first.pinned).toBe(false);
  stop();
  f.track(second);
  expect(f.element.scrollTop).toBe(1600);
});

test("temporary short content does not erase a saved position", () => {
  const f = fixture();
  const position = { top: 500, pinned: false };
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 200;
  f.track(position);
  f.flushScroll();
  expect(position.top).toBe(500);
  expect(position.pinned).toBe(false);
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1000;
  f.resize();
  expect(f.element.scrollTop).toBe(500);
});

test("pinScrollToBottom jumps to the end and resumes following growth", () => {
  const f = fixture();
  const position = { top: 0, pinned: true };
  f.track(position);
  f.scrollTo(250);
  expect(position.pinned).toBe(false);
  pinScrollToBottom(f.element, position);
  f.flushScroll();
  expect(position.pinned).toBe(true);
  expect(f.element.scrollTop).toBe(800);
  (f.element as unknown as { scrollHeight: number }).scrollHeight = 1400;
  f.resize();
  expect(f.element.scrollTop).toBe(1200);
});

test("leaving a session disconnects tracking so future events cannot change its state", () => {
  const f = fixture();
  const position = { top: 300, pinned: false };
  const stop = f.track(position);
  stop();
  expect(f.activeObservers()).toBe(0);
  f.scrollTo(800);
  expect(position).toEqual({ top: 300, pinned: false });
});

test("a width change keeps the same message at the top instead of the same pixel offset", () => {
  const f = fixture();
  const ids = ["a", "b", "c", "d", "e"];
  f.layout(ids, 200, 600);
  const position: ScrollPosition = { top: 0, pinned: true };
  f.track(position);
  f.scrollTo(500);
  expect(position.anchor).toEqual({ id: "c", ratio: 0.5, width: 600 });

  // The right rail opens: the transcript narrows and every message wraps taller.
  f.layout(ids, 300, 400);
  f.resize();
  expect(f.element.scrollTop).toBe(750);
  expect(position.top).toBe(750);
  f.flushScroll();
  expect(position.anchor).toEqual({ id: "c", ratio: 0.5, width: 400 });

  // It closes again.
  f.layout(ids, 200, 600);
  f.resize();
  expect(f.element.scrollTop).toBe(500);

  // At the same width, growth below the viewport still keeps the offset.
  f.layout([...ids, "f"], 200, 600);
  f.resize();
  expect(f.element.scrollTop).toBe(500);
});

test("a width change while following the bottom stays at the bottom", () => {
  const f = fixture();
  f.layout(["a", "b", "c", "d", "e"], 200, 600);
  const position: ScrollPosition = { top: 0, pinned: true };
  f.track(position);
  f.layout(["a", "b", "c", "d", "e"], 300, 400);
  f.resize();
  expect(f.element.scrollTop).toBe(1300);
  expect(position.anchor).toBeUndefined();
});
