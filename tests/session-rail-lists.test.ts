import { test, expect } from "vitest";
import { pinSessionInLists } from "../src/main/railLists/pinSessionInLists";
import { unpinSessionInLists } from "../src/main/railLists/unpinSessionInLists";
import { prependUnpinnedInLists } from "../src/main/railLists/prependUnpinnedInLists";
import { loadListsFromPersisted } from "../src/main/railLists/loadListsFromPersisted";
import { nextActiveAfterClose } from "../src/main/railLists/nextActiveAfterClose";

const base = { pinnedIds: ["p1", "p2"], unpinnedIds: ["u1", "u2", "u3"] };

test("pin moves id from unpinned to front of pinned", () => {
  const next = pinSessionInLists(base, "u2");
  expect(next.pinnedIds.join(",")).toBe("u2,p1,p2");
  expect(next.unpinnedIds.join(",")).toBe("u1,u3");
});

test("unpin prepends to unpinned", () => {
  const next = unpinSessionInLists(base, "p2");
  expect(next.pinnedIds.join(",")).toBe("p1");
  expect(next.unpinnedIds.join(",")).toBe("p2,u1,u2,u3");
});

test("prependUnpinned ignores pinned ids", () => {
  const next = prependUnpinnedInLists(base, "p1");
  expect(next).toEqual(base);
});

test("loadListsFromPersisted keeps id order and drops duplicates", () => {
  const loaded = loadListsFromPersisted(["p1", "p2", "p1"], ["u1", "p2", "u2"]);
  expect(loaded.lists.pinnedIds.join(",")).toBe("p1,p2");
  expect(loaded.lists.unpinnedIds.join(",")).toBe("u1,u2");
  expect(loaded.openIds.join(",")).toBe("p1,p2,u1,u2");
});

test("nextActiveAfterClose prefers next, then previous, then null", () => {
  expect(nextActiveAfterClose(base, "u1")).toBe("u2");
  expect(nextActiveAfterClose(base, "u3")).toBe("u2");
  expect(nextActiveAfterClose(base, "p1")).toBe("p2");
  expect(nextActiveAfterClose({ pinnedIds: ["only"], unpinnedIds: [] }, "only")).toBe(null);
  expect(nextActiveAfterClose(base, "missing")).toBe(null);
});
