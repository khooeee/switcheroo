import { createHash } from "node:crypto";
import { test, expect } from "vitest";
import { airForkPoint } from "../src/main/acp/airForkPoint";

const item = (id: string, role: "user" | "assistant" | "tool", text: string) => ({
  id,
  role,
  text,
  at: 0,
});
const turn = (
  assistant: ReturnType<typeof item> | null,
  events: ReturnType<typeof item>[] = [],
) => ({
  id: `turn-${Math.random()}`,
  at: 0,
  user: item(`user-${Math.random()}`, "user", "hi"),
  assistant,
  events,
  fileChanges: [],
  status: "complete" as const,
});
const sha = (text: string) =>
  `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

test("airForkPoint is undefined before any assistant message", () => {
  expect(airForkPoint([])).toBe(undefined);
  expect(airForkPoint([turn(null, [item("t1", "tool", "ls")])])).toBe(undefined);
});

test("airForkPoint targets the newest assistant message and counts repeats of its text", () => {
  const turns = [
    turn(item("msg_2", "assistant", "Done"), [
      item("msg_1", "assistant", "Done"),
      item("t1", "tool", "ls"),
    ]),
    turn(item("msg_3", "assistant", "Done")),
  ];
  expect({ ...airForkPoint(turns) }).toEqual({
    messageId: "msg_3",
    messageFingerprint: sha("Done"),
    messageOccurrence: 3,
  });
});

test("airForkPoint falls back to an earlier assistant in events when the turn was clipped", () => {
  const turns = [turn(null, [item("msg_1", "assistant", "Looking"), item("t1", "tool", "ls")])];
  expect({ ...airForkPoint(turns) }).toEqual({
    messageId: "msg_1",
    messageFingerprint: sha("Looking"),
    messageOccurrence: 1,
  });
});
