import { expect, test } from "vitest";
import { finalizeStalledTurns } from "../src/main/finalizeStalledTurns";
import type { TranscriptTurn } from "../src/shared/types";

const turn = (status: TranscriptTurn["status"], queued?: boolean): TranscriptTurn => ({
  id: "t1",
  at: 1,
  user: { id: "u1", role: "user", text: "hi", at: 1, ...(queued ? { queued: true } : {}) },
  assistant: null,
  events: [],
  fileChanges: [],
  status,
});

test("finalizeStalledTurns marks running turns stopped and clears queued", () => {
  const running = turn("running", true);
  const done = turn("complete");
  const next = finalizeStalledTurns([running, done]);
  expect(next[0]!.status).toBe("stopped");
  expect(next[0]!.user.queued).toBeUndefined();
  expect(next[1]).toBe(done);
});

test("finalizeStalledTurns returns the same array when nothing is running", () => {
  const turns = [turn("complete"), turn("stopped")];
  expect(finalizeStalledTurns(turns)).toBe(turns);
});
