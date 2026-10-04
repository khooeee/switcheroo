import { test, expect } from "vitest";
import { switchboardCleanupCutoff } from "../src/main/switchboardCleanup";

const DAY = 24 * 60 * 60 * 1000;

test("cutoff is days before now; non-positive disables", () => {
  const now = 1_700_000_000_000;
  expect(switchboardCleanupCutoff(30, now)).toBe(now - 30 * DAY);
  expect(switchboardCleanupCutoff(0, now)).toBe(null);
  expect(switchboardCleanupCutoff(-1, now)).toBe(null);
  expect(switchboardCleanupCutoff(Number.NaN, now)).toBe(null);
});
