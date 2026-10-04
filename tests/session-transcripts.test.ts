import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect, vi, afterEach } from "vitest";

const { userDataDir } = vi.hoisted(() => ({
  userDataDir: { current: "" },
}));

vi.mock("electron", () => ({
  app: { getPath: () => userDataDir.current },
}));

import * as transcripts from "../src/main/sessionTranscripts";
import * as meta from "../src/main/sessionMeta";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-sessions-"));
  tempDirs.push(dir);
  userDataDir.current = dir;
  return {
    dir,
    sessions: path.join(dir, "sessions"),
    transcripts,
    meta,
  };
}

const turns = [
  {
    id: "t1",
    at: 1,
    user: { id: "a", role: "user" as const, text: "Hi", at: 1 },
    assistant: { id: "b", role: "assistant" as const, text: "Hello\nthere", at: 2 },
    events: [],
    fileChanges: [],
    status: "complete" as const,
  },
];

test("transcript JSONL lives at sessions/<id>/transcript.jsonl", async () => {
  const { sessions, transcripts: store } = await fixture();
  await store.saveTranscript("session-1", turns);
  const file = path.join(sessions, "session-1", "transcript.jsonl");
  const raw = await fs.readFile(file, "utf8");
  const lines = raw.trimEnd().split("\n");
  expect(lines).toHaveLength(turns.length);
  expect(JSON.stringify(JSON.parse(lines[0]))).toBe(JSON.stringify(turns[0]));
  expect(JSON.stringify(await store.loadTranscript("session-1"))).toBe(JSON.stringify(turns));
});

test("meta round-trips beside the transcript", async () => {
  const { meta: store } = await fixture();
  await store.saveSessionMeta("session-1", {
    title: "Demo",
    agent: "codex",
    cwd: "/tmp",
    agentSessionId: null,
    usage: { used: 12_000, size: 272_000 },
  });
  const loaded = await store.loadSessionMeta("session-1");
  expect(loaded!.title).toBe("Demo");
  expect(loaded!.usage!.used).toBe(12_000);
  expect(loaded!.usage!.size).toBe(272_000);
});
