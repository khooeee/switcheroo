import { test, expect } from "vitest";
import { overflowSessionIds } from "../src/main/overflowSessionIds";

test("no overflow when under max or max disabled", () => {
  expect(overflowSessionIds(["a", "b"], 300).length).toBe(0);
  expect(overflowSessionIds(["a", "b", "c"], 0).length).toBe(0);
  expect(overflowSessionIds(["a", "b", "c"], -1).length).toBe(0);
});

test("drops from the end and keeps protectId", () => {
  expect(overflowSessionIds(["a", "b", "c", "d"], 2).join(",")).toBe("d,c");
  expect(overflowSessionIds(["a", "b", "c", "d"], 2, "d").join(",")).toBe("c,b");
  expect(overflowSessionIds(["a", "b", "c"], 2, "c").join(",")).toBe("b");
});
