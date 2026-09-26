const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "./sessionTitle") return { randomSessionTitle: () => "Cedar" };
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
    },
  });
  return exports;
}

test("title is the first field in the new session modal", () => {
  const { NewTabModal } = load("src/renderer/features/tabs/NewTabModal.tsx");
  const html = renderToStaticMarkup(
    React.createElement(NewTabModal, { onCancel() {}, onCreate: async () => {} }),
  );
  const title = html.indexOf(">Title<");
  const agent = html.indexOf(">Agent<");
  const folder = html.indexOf(">Workspace folder<");
  assert.ok(title >= 0 && agent >= 0 && folder >= 0);
  assert.ok(title < agent && agent < folder);
});
