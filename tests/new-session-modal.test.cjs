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
      if (name === "../settings/appSettingsCache") {
        return {
          getAppSettingsCache: () => ({
            theme: "dark",
            zenMode: true,
            soundEnabled: true,
            railWidth: 160,
            composerHeight: 72,
            lastAgent: "claude",
            lastCwd: "",
            lastPrefix: "Acme",
            lastSwitcherooAware: false,
            lastPin: false,
          }),
          patchAppSettings: async () => ({}),
        };
      }
      if (name === "../modals/trapModalTabFocus") {
        return { trapModalTabFocus() {} };
      }
      return require(name);
    },
  });
  return exports;
}

test("prefix comes before title; title is still the focused field", () => {
  const { NewSessionModal } = load();
  const html = renderToStaticMarkup(
    React.createElement(NewSessionModal, { onCancel() {}, canPin: true, onCreate: async () => {} }),
  );
  const prefix = html.indexOf(">Prefix<");
  const title = html.indexOf(">Title<");
  const agent = html.indexOf(">Agent<");
  const folder = html.indexOf(">Folder<");
  assert.ok(prefix >= 0 && title >= 0 && agent >= 0 && folder >= 0);
  assert.ok(prefix < title && title < agent && agent < folder);
  assert.match(html, /value="Acme"/);
  assert.ok(html.includes('value="Cedar"'));
});
