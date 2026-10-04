import { test, expect } from "vitest";
import { AgentForkSupport } from "../src/main/acp/AgentForkSupport";

test("fork stays available until an agent kind reports otherwise", () => {
  const support = new AgentForkSupport();
  expect({ ...support.flags("cursor") }).toEqual({
    supportsFork: true,
    supportsForkAtMessage: false,
  });
  expect(support.record("cursor", false)).toBe(true);
  expect(support.record("cursor", false)).toBe(false);
  expect({ ...support.flags("cursor") }).toEqual({
    supportsFork: false,
    supportsForkAtMessage: false,
  });
});

test("only adapters that read the AIR fork point can fork from a message", () => {
  const support = new AgentForkSupport();
  for (const agent of ["claude", "codex"]) {
    support.record(agent, true);
    expect(support.flags(agent).supportsForkAtMessage).toBe(true);
  }
  support.record("pi", true);
  expect(support.flags("pi").supportsForkAtMessage).toBe(false);
  support.record("claude", false);
  expect({ ...support.flags("claude") }).toEqual({
    supportsFork: false,
    supportsForkAtMessage: false,
  });
});
