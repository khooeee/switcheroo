import { test, expect } from "vitest";
import { autoApprovePermission } from "../src/main/acp/autoApprovePermission";

test("prefers allow always over allow once", () => {
  expect(
    autoApprovePermission([
      { optionId: "once", kind: "allow_once" },
      { optionId: "always", kind: "allow_always" },
    ]),
  ).toBe("always");
});

test("falls back to allow once", () => {
  expect(autoApprovePermission([{ optionId: "once", kind: "allow_once" }])).toBe("once");
});

test("does not select reject options", () => {
  expect(
    autoApprovePermission([
      { optionId: "reject", kind: "reject_once" },
      { optionId: "never", kind: "reject_always" },
    ]),
  ).toBe(null);
});
