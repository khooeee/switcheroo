const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load() {
  const file = path.resolve(__dirname, "../src/renderer/features/sessions/NewSessionModal.tsx");
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "./sessionTitle") return { randomSessionTitle: () => "Cedar" };
      if (name.endsWith("/shared/types") || name.endsWith("shared/types")) {
        return {
          isAgentKind: (value) => ["claude", "codex", "cursor", "pi"].includes(value),
        };
      }
      return require(name);
    },
  });
  return exports;
}

test("title is the first field in the new session modal", () => {
  const { NewSessionModal } = load();
  const html = renderToStaticMarkup(
    React.createElement(NewSessionModal, { onCancel() {}, onCreate: async () => {} }),
  );
  const title = html.indexOf(">Title<");
  const agent = html.indexOf(">Agent<");
  const folder = html.indexOf(">Workspace folder<");
  assert.ok(title >= 0 && agent >= 0 && folder >= 0);
  assert.ok(title < agent && agent < folder);
});
