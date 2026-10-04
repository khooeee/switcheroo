import { test, expect } from "vitest";
import { formatAgentError } from "../src/shared/formatAgentError";

test("prefers RequestError data.details over Internal error", () => {
  const error = Object.assign(new Error("Internal error"), {
    data: { details: "pi compact failed: Nothing to compact (session too small)" },
  });
  expect(formatAgentError(error)).toBe(
    "pi compact failed: Nothing to compact (session too small)",
  );
});

test("falls back to message when details are missing", () => {
  expect(formatAgentError(new Error("boom"))).toBe("boom");
  expect(formatAgentError("plain")).toBe("plain");
});

test("strips Electron IPC invoke prefix", () => {
  expect(formatAgentError(new Error("Error invoking remote method 'session:prompt': boom"))).toBe(
    "boom",
  );
});
