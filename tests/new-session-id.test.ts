import { test, expect } from "vitest";
import { newSessionId } from "../src/main/newSessionId";

test("newSessionId is YYYY-MM-DD plus a uuid", () => {
  const now = new Date(2026, 8, 26); // local Sep 26, 2026
  const id = newSessionId(now);
  expect(id).toMatch(
    /^2026-09-26-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
});

test("newSessionId defaults to today", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  expect(newSessionId().startsWith(`${y}-${m}-${d}-`)).toBeTruthy();
});
