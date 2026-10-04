import { afterEach, expect, test, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { SwitchboardTurn } from "../src/shared/types";

const electronState = vi.hoisted(() => ({
  userData: "" as string,
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => electronState.userData,
  },
}));

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-switchboard-"));
  tempDirs.push(dir);
  electronState.userData = dir;
  vi.resetModules();
  const store = await import("../src/main/switchboardEvents");
  return {
    path: path.join(dir, "switchboard.jsonl"),
    store,
  };
}

const turns: SwitchboardTurn[] = [
  {
    id: "t1",
    at: 1,
    user: { id: "u1", role: "user", text: "Hi", at: 1 },
    assistant: { id: "a1", role: "assistant", text: "Hello", at: 2 },
    events: [],
    fileChanges: [],
    status: "complete",
    sessionId: "s1",
    agent: "codex",
    navigable: true,
  },
];

test("switchboard JSONL round-trips at switchboard.jsonl", async () => {
  const { path: file, store } = await fixture();
  await store.saveSwitchboardTurns(turns);
  const raw = await fs.readFile(file, "utf8");
  const lines = raw.trimEnd().split("\n");
  expect(lines).toHaveLength(turns.length);
  expect(JSON.stringify(JSON.parse(lines[0]!))).toBe(JSON.stringify(turns[0]));
  expect(JSON.stringify(await store.loadSwitchboardTurns())).toBe(JSON.stringify(turns));
});

test("empty switchboard save writes an empty file", async () => {
  const { path: file, store } = await fixture();
  await store.saveSwitchboardTurns(turns);
  await store.saveSwitchboardTurns([]);
  expect(await fs.readFile(file, "utf8")).toBe("");
  expect(JSON.stringify(await store.loadSwitchboardTurns())).toBe("[]");
});
