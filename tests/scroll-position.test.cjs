const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function fixture() {
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  }
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname,
    "../src/renderer/features/sessions/trackScrollPosition.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports, ResizeObserver: Observer, MutationObserver: Observer,
  });
  let top = 0;
  let scroll;
  const element = {
    scrollHeight: 1000,
    clientHeight: 200,
    children: [{}],
    get scrollTop() { return top; },
    set scrollTop(value) { top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); },
    addEventListener(_event, listener) { scroll = listener; },
    removeEventListener() { scroll = undefined; },
  };
  return {
    element,
    track: (position) => exports.trackScrollPosition(element, position),
    scrollTo(value) { element.scrollTop = value; scroll?.(); },
    flushScroll() { scroll?.(); },
    resize() { observers.filter((o) => o.active).forEach((o) => o.callback()); },
    activeObservers: () => observers.filter((o) => o.active).length,
  };
}

test("new sessions start at the bottom and follow streaming growth and viewport resizing", () => {
  const f = fixture();
  f.track({ top: 0, pinned: true });
  assert.equal(f.element.scrollTop, 800);
  f.element.scrollHeight = 1400;
  f.resize();
  assert.equal(f.element.scrollTop, 1200);
  f.element.clientHeight = 300;
  f.resize();
  assert.equal(f.element.scrollTop, 1100);
});

test("scrolling up stops following; returning to the bottom resumes it", () => {
  const f = fixture();
  const position = { top: 0, pinned: true };
  f.track(position);
  f.scrollTo(250);
  f.element.scrollHeight = 1400;
  f.resize();
  assert.equal(f.element.scrollTop, 250);
  assert.equal(position.pinned, false);
  f.scrollTo(1200);
  f.element.scrollHeight = 1600;
  f.resize();
  assert.equal(f.element.scrollTop, 1400);
  assert.equal(position.pinned, true);
});

test("switching sessions restores independent positions, including after background growth", () => {
  const f = fixture();
  const first = { top: 0, pinned: true };
  const second = { top: 0, pinned: true };
  let stop = f.track(first);
  f.scrollTo(300);
  stop();
  stop = f.track(second);
  assert.equal(f.element.scrollTop, 800);
  stop();
  f.element.scrollHeight = 1800;
  stop = f.track(first);
  f.flushScroll();
  assert.equal(f.element.scrollTop, 300);
  assert.equal(first.pinned, false);
  stop();
  f.track(second);
  assert.equal(f.element.scrollTop, 1600);
});

test("temporary short content does not erase a saved position", () => {
  const f = fixture();
  const position = { top: 500, pinned: false };
  f.element.scrollHeight = 200;
  f.track(position);
  f.flushScroll();
  assert.equal(position.top, 500);
  assert.equal(position.pinned, false);
  f.element.scrollHeight = 1000;
  f.resize();
  assert.equal(f.element.scrollTop, 500);
});

test("leaving a session disconnects tracking so future events cannot change its state", () => {
  const f = fixture();
  const position = { top: 300, pinned: false };
  const stop = f.track(position);
  stop();
  assert.equal(f.activeObservers(), 0);
  f.scrollTo(800);
  assert.deepEqual(position, { top: 300, pinned: false });
});
