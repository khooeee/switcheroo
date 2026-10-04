import { test, expect, vi, beforeEach } from "vitest";

const { mockPresets } = vi.hoisted(() => ({
  mockPresets: {} as Record<string, {
    command: string;
    args: string[];
    requiredCommand?: string;
  }>,
}));

vi.mock("../src/main/acp/presets", () => ({
  AGENT_PRESETS: mockPresets,
}));

import { availableAgents } from "../src/main/acp/availableAgents";

beforeEach(() => {
  for (const key of Object.keys(mockPresets)) delete mockPresets[key];
});

test("availableAgents keeps agents whose command and adapter resolve", () => {
  Object.assign(mockPresets, {
    claude: { command: process.execPath, args: [import.meta.filename] },
    codex: { command: "node", args: [] },
    cursor: { command: "/nonexistent/switcheroo-agent", args: ["acp"] },
    pi: { command: "switcheroo-missing-cli-on-path", args: [] },
  });
  expect([...availableAgents()]).toEqual(["claude", "codex"]);
});

test("availableAgents drops agents whose adapter needs a CLI that is not installed", () => {
  Object.assign(mockPresets, {
    codex: { command: process.execPath, args: [], requiredCommand: "node" },
    pi: { command: process.execPath, args: [], requiredCommand: "switcheroo-missing-pi" },
  });
  expect([...availableAgents()]).toEqual(["codex"]);
});

test("availableAgents drops agents whose adapter package is missing", () => {
  Object.assign(mockPresets, {
    claude: {
      command: process.execPath,
      get args() {
        throw new Error("ACP adapter not installed: x");
      },
    },
    codex: { command: process.execPath, args: ["/nonexistent/adapter/index.js"] },
  });
  expect([...availableAgents()]).toEqual([]);
});
