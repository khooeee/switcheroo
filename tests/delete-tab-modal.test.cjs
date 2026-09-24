const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function fixture(onDelete) {
  const exports = {};
  const state = [];
  const refs = [];
  let stateIndex, refIndex, cancelled = 0;
  const source = fs.readFileSync(path.join(__dirname, "../src/renderer/features/tabs/DeleteTabModal.tsx"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { exports, Error, require(name) {
    if (name.endsWith(".css")) return {};
    if (name !== "react") return require(name);
    return {
      useEffect() {},
      useState(initial) {
        const i = stateIndex++;
        if (!(i in state)) state[i] = initial;
        return [state[i], (value) => { state[i] = value; }];
      },
      useRef(initial) {
        const i = refIndex++;
        return refs[i] ??= { current: initial };
      },
    };
  } });
  return {
    get cancelled() { return cancelled; },
    render() {
      stateIndex = refIndex = 0;
      const dialog = exports.DeleteTabModal({ tab: { id: "tab-1", title: "Work", status: "running" },
        onCancel: () => cancelled++, onDelete });
      const children = dialog.props.children;
      const buttons = children[3].props.children;
      return { dialog, cancel: buttons[0], confirm: buttons[1], error: children[2] };
    },
  };
}
const tick = () => new Promise(setImmediate);

test("opening or cancelling the modal never deletes a tab", () => {
  let deletes = 0;
  const f = fixture(async () => deletes++);
  const ui = f.render();
  assert.equal(deletes, 0);
  ui.cancel.props.onClick();
  let prevented = false;
  ui.dialog.props.onCancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.cancelled, 2);
  assert.equal(deletes, 0);
});

test("confirmation deletes the selected tab once and waits before closing", async () => {
  let finish;
  const deleted = [];
  const f = fixture((id) => { deleted.push(id); return new Promise((resolve) => { finish = resolve; }); });
  const ui = f.render();
  ui.confirm.props.onClick();
  ui.confirm.props.onClick();
  assert.deepEqual(deleted, ["tab-1"]);
  assert.equal(f.render().confirm.props.disabled, true);
  ui.dialog.props.onCancel({ preventDefault() {} });
  assert.equal(f.cancelled, 0);
  finish();
  await tick();
  assert.equal(f.cancelled, 1);
});

test("failed deletion shows an error and permits retry", async () => {
  let attempts = 0;
  const f = fixture(async () => { if (++attempts === 1) throw new Error("Save failed"); });
  f.render().confirm.props.onClick();
  await tick();
  const ui = f.render();
  assert.equal(ui.error.props.role, "alert");
  assert.equal(ui.error.props.children, "Save failed");
  assert.equal(ui.confirm.props.disabled, false);
  assert.equal(f.cancelled, 0);
  ui.confirm.props.onClick();
  await tick();
  assert.equal(f.cancelled, 1);
});
