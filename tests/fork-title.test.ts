import { test, expect } from "vitest";
import { nextForkTitle } from "../src/shared/nextForkTitle";

test("nextForkTitle picks the lowest unused fork number", () => {
  expect(nextForkTitle("Alpha", [])).toBe("Alpha (fork #1)");
  expect(nextForkTitle("Alpha", ["Alpha (fork #1)"])).toBe("Alpha (fork #2)");
  expect(nextForkTitle("Alpha", ["Alpha (fork #1)", "Alpha (fork #3)"])).toBe("Alpha (fork #2)");
});

test("nextForkTitle reuses an existing fork suffix and increments from there", () => {
  expect(nextForkTitle("Alpha (fork #1)", ["Alpha (fork #1)"])).toBe("Alpha (fork #2)");
  expect(nextForkTitle("Alpha (fork #2)", ["Alpha (fork #1)", "Alpha (fork #2)"])).toBe(
    "Alpha (fork #3)",
  );
  expect(nextForkTitle("Alpha (fork #2)", ["Alpha (fork #2)", "Alpha (fork #3)"])).toBe(
    "Alpha (fork #4)",
  );
  expect(
    nextForkTitle("Alpha (fork #1)", ["Alpha (fork #1)", "Alpha (fork #2)", "Alpha (fork #4)"]),
  ).toBe("Alpha (fork #3)");
});
