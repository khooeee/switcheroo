const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load({ available = null, lastAgent = "claude" } = {}) {
  const file = path.resolve(__dirname, "../src/renderer/features/sessions/NewSessionModal.tsx");
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "./sessionTitle") return { randomSessionTitle: () => "Cedar" };
      if (name === "./useAvailableAgents") return { useAvailableAgents: () => available };
      if (name === "../settings/appSettingsCache") {
        return {
          getAppSettingsCache: () => ({
            theme: "dark",
            zenMode: true,
            soundEnabled: true,
            railWidth: 160,
            composerHeight: 72,
            lastAgent,
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

function render(options) {
  const { NewSessionModal } = load(options);
  return renderToStaticMarkup(
    React.createElement(NewSessionModal, { onCancel() {}, canPin: true, onCreate: async () => {} }),
  );
}

test("agent dropdown lists every agent until availability is known", () => {
  const html = render();
  for (const label of ["Claude Code", "Codex", "Cursor", "Pi"]) assert.ok(html.includes(`>${label}<`));
});

test("agent dropdown hides agents that are not installed", () => {
  const html = render({ available: ["claude", "codex", "pi"] });
  assert.ok(!html.includes(">Cursor<"));
  assert.ok(html.includes(">Claude Code<") && html.includes(">Pi<"));
});

test("remembered agent that is no longer installed falls back to the first available", () => {
  const html = render({ available: ["codex", "pi"], lastAgent: "cursor" });
  assert.match(html, /<option value="codex" selected="">Codex<\/option>/);
});

test("no installed agents disables the dropdown and Create", () => {
  const html = render({ available: [] });
  assert.ok(html.includes("No ACP agents installed"));
  assert.match(html, /<select[^>]*disabled=""/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Create</);
});
