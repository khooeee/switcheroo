import { expect, test } from "vitest";
import type { TranscriptTurn } from "../src/shared/transcript";
import { fixture } from "./session-fixture";

const tick = () => new Promise(setImmediate);

type Fixture = Awaited<ReturnType<typeof fixture>>;

function promptTexts(f: Fixture): string[] {
  return f.requests
    .filter((request) => request.method === "prompt")
    .map((request) => (request.params as { prompt: Array<{ text: string }> }).prompt[0]!.text);
}

function latest(f: Fixture, turnId: string): TranscriptTurn {
  return f.transcripts.filter((turn) => turn.id === turnId).at(-1) as unknown as TranscriptTurn;
}

test("follow-ups queue behind an exclusive prompt as their own turn instead of steering", async () => {
  const f = await fixture();
  const bootstrapId = await f.session.prompt("bootstrap", { wait: false, exclusive: true });
  const followUpId = await f.session.prompt("follow-up", { wait: false });
  expect(followUpId).not.toBe(bootstrapId);
  expect(f.requests.some((request) => request.method === "_session/steering")).toBe(false);
  expect(promptTexts(f)).toEqual(["bootstrap"]);
  expect(latest(f, followUpId).user.queued).toBe(true);

  f.turns[0]!({ stopReason: "end_turn" });
  await tick();
  expect(promptTexts(f)).toEqual(["bootstrap", "follow-up"]);
  expect(latest(f, bootstrapId).status).toBe("complete");
  expect(latest(f, followUpId).status).toBe("running");
  expect(latest(f, followUpId).user.queued).toBeUndefined();

  f.turns[1]!({ stopReason: "end_turn" });
  await tick();
  expect(latest(f, followUpId).status).toBe("complete");
});

test("steering resumes once a non-exclusive turn is running", async () => {
  const f = await fixture();
  await f.session.prompt("bootstrap", { wait: false, exclusive: true });
  f.turns[0]!({ stopReason: "end_turn" });
  await tick();
  await f.session.prompt("work", { wait: false });
  await f.session.prompt("steer");
  expect(f.requests.filter((request) => request.method === "_session/steering").length).toBe(1);
  expect(promptTexts(f)).toEqual(["bootstrap", "work"]);
});

test("cancelling an exclusive turn discards queued follow-ups", async () => {
  const f = await fixture();
  const bootstrapId = await f.session.prompt("bootstrap", { wait: false, exclusive: true });
  await f.session.prompt("follow-up", { wait: false });
  await f.session.cancel();
  f.turns[0]!({ stopReason: "cancelled" });
  await tick();
  expect(promptTexts(f)).toEqual(["bootstrap"]);
  expect(latest(f, bootstrapId).status).toBe("stopped");
});
