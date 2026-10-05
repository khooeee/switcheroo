import { test, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AgentKind } from "../src/shared/types";

const mocks = vi.hoisted(() => ({
  available: null as AgentKind[] | null,
  lastAgent: "claude" as AgentKind,
}));

vi.mock("../src/renderer/features/sessions/sessionTitle", () => ({
  randomSessionTitle: () => "Cedar",
}));

vi.mock("../src/renderer/features/sessions/useAvailableAgents", () => ({
  useAvailableAgents: () => mocks.available,
}));

vi.mock("../src/renderer/features/settings/appSettingsCache", () => ({
  getAppSettingsCache: () => ({
    theme: "dark",
    zenMode: true,
    soundEnabled: true,
    railWidth: 160,
    composerHeight: 72,
    lastAgent: mocks.lastAgent,
    lastCwd: "",
    lastPrefix: "Acme",
    lastSwitcherooAware: false,
    lastPin: false,
  }),
  patchAppSettings: async () => ({}),
}));

vi.mock("../src/renderer/features/modals/trapModalTabFocus", () => ({
  trapModalTabFocus() {},
}));

import { NewSessionModal } from "../src/renderer/features/sessions/NewSessionModal";

beforeEach(() => {
  mocks.available = null;
  mocks.lastAgent = "claude";
});

function render(options: { available?: AgentKind[] | null; lastAgent?: AgentKind } = {}) {
  if (options.available !== undefined) mocks.available = options.available;
  if (options.lastAgent !== undefined) mocks.lastAgent = options.lastAgent;
  return renderToStaticMarkup(
    <NewSessionModal onCancel={() => {}} canPin onCreate={async () => {}} />,
  );
}

test("prefix comes before title; title is still the focused field", () => {
  const html = render();
  const prefix = html.indexOf(">Prefix<");
  const title = html.indexOf(">Title<");
  const agent = html.indexOf(">Agent<");
  const folder = html.indexOf(">Folder<");
  expect(prefix >= 0 && title >= 0 && agent >= 0 && folder >= 0).toBe(true);
  expect(prefix < title && title < agent && agent < folder).toBe(true);
  expect(html).toMatch(/value="Acme"/);
  expect(html).toContain('value="Cedar"');
});

test("agent dropdown lists every agent until availability is known", () => {
  const html = render();
  for (const label of ["Claude Code", "Codex", "Cursor", "Pi", "Prime Agent"]) {
    expect(html).toContain(`>${label}<`);
  }
});

test("agent dropdown hides agents that are not installed", () => {
  const html = render({ available: ["claude", "codex", "pi"] });
  expect(html).not.toContain(">Cursor<");
  expect(html.includes(">Claude Code<") && html.includes(">Pi<")).toBe(true);
});

test("remembered agent that is no longer installed falls back to the first available", () => {
  const html = render({ available: ["codex", "pi"], lastAgent: "cursor" });
  expect(html).toMatch(/<option value="codex" selected="">Codex<\/option>/);
});

test("no installed agents disables the dropdown and Create", () => {
  const html = render({ available: [] });
  expect(html).toContain("No ACP agents installed");
  expect(html).toMatch(/<select[^>]*disabled=""/);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Create</);
});
