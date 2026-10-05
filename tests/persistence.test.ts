import { afterEach, expect, test, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { PersistedState } from "../src/shared/types";

const electronState = vi.hoisted(() => ({
  userData: "" as string,
  quitHandler: null as ((event: { preventDefault: () => void }) => void) | null,
  errors: [] as unknown[][],
}));

const fsState = vi.hoisted(() => ({
  failWrite: false,
  real: null as typeof import("node:fs/promises") | null,
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => electronState.userData,
    on: (_name: string, callback: (event: { preventDefault: () => void }) => void) => {
      electronState.quitHandler = callback;
    },
    quit: () => {
      let blocked = false;
      electronState.quitHandler?.({
        preventDefault: () => {
          blocked = true;
        },
      });
      return blocked;
    },
  },
  dialog: {
    showErrorBox: (...args: unknown[]) => {
      electronState.errors.push(args);
    },
  },
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  fsState.real = actual;
  return {
    ...actual,
    writeFile: (...args: Parameters<typeof actual.writeFile>) => {
      if (fsState.failWrite) return Promise.reject(new Error("Disk full"));
      return actual.writeFile(...args);
    },
  };
});

let tempDirs: string[] = [];

afterEach(async () => {
  fsState.failWrite = false;
  await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs = [];
  electronState.quitHandler = null;
  electronState.errors = [];
});

async function loadPersist() {
  vi.resetModules();
  return import("../src/main/persist");
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switcheroo-persistence-"));
  tempDirs.push(dir);
  electronState.userData = dir;
  const store = await loadPersist();
  return {
    target: path.join(dir, "switcheroo.json"),
    store,
    restart: () => loadPersist(),
  };
}

function state(): PersistedState {
  return {
    version: 1,
    activeTabId: "agent-1",
    pinned: ["agent-0"],
    unpinned: ["agent-1"],
  };
}

test("pinned and unpinned round-trip", async () => {
  const { store, restart } = await fixture();
  const snapshot = state();
  await store.saveState(snapshot);
  const restarted = await restart();
  expect(JSON.stringify(await restarted.loadState())).toBe(JSON.stringify(snapshot));
});

test("loads legacy activeSessionId as activeTabId", async () => {
  const { target, restart } = await fixture();
  await fs.writeFile(
    target,
    JSON.stringify({
      version: 1,
      activeSessionId: "legacy-1",
      pinned: [],
      unpinned: ["legacy-1"],
    }),
  );
  const store = await restart();
  expect(await store.loadState()).toEqual({
    version: 1,
    activeTabId: "legacy-1",
    pinned: [],
    unpinned: ["legacy-1"],
  });
});

for (const initial of [null, "", "  \n"] as const) {
  test(`save and restore after restart with initial file ${JSON.stringify(initial)}`, async () => {
    const { target, store, restart } = await fixture();
    if (initial !== null) await fs.writeFile(target, initial);
    expect(await store.loadState()).toBe(null);
    await store.saveState(state());
    const restarted = await restart();
    expect(JSON.stringify(await restarted.loadState())).toBe(JSON.stringify(state()));
  });
}

test("overlapping saves finish in order and capture the state at call time", async () => {
  const { target, store } = await fixture();
  const saves = [];
  for (let i = 0; i < 50; i++) {
    saves.push(
      store.saveState({
        version: 1,
        activeTabId: `agent-${i}`,
        pinned: [],
        unpinned: ["agent-1"],
      }),
    );
  }
  await Promise.all(saves);
  expect(JSON.parse(await fs.readFile(target, "utf8")).activeTabId).toBe("agent-49");
});

test("a failed write preserves the previous file and allows a retry", async () => {
  const { target, store } = await fixture();
  await store.saveState(state());
  fsState.failWrite = true;
  await expect(
    store.saveState({ ...state(), activeTabId: "switchboard" }),
  ).rejects.toThrow(/Disk full/);
  expect(JSON.parse(await fs.readFile(target, "utf8")).activeTabId).toBe("agent-1");
  fsState.failWrite = false;
  await store.saveState({ ...state(), activeTabId: "switchboard" });
  expect(JSON.parse(await fs.readFile(target, "utf8")).activeTabId).toBe("switchboard");
});

for (const contents of ["{broken", '{"version":2}']) {
  test(`preserve unreadable or unsupported state: ${contents}`, async () => {
    const { target, store } = await fixture();
    await fs.writeFile(target, contents);
    expect(await store.loadState()).toBe(null);
    await expect(store.saveState(state())).rejects.toThrow(/preserving the existing file/);
    expect(await fs.readFile(target, "utf8")).toBe(contents);
  });
}

async function quitFixture(save: () => Promise<void>) {
  electronState.quitHandler = null;
  electronState.errors = [];
  let prevented = 0;
  let exited = 0;
  const { app } = await import("electron");
  (app as { quit: () => void }).quit = () => {
    let blocked = false;
    electronState.quitHandler?.({
      preventDefault: () => {
        blocked = true;
        prevented++;
      },
    });
    if (!blocked) exited++;
  };
  vi.resetModules();
  const { installQuitHandler } = await import("../src/main/installQuitHandler");
  installQuitHandler(save);
  return {
    app,
    errors: electronState.errors,
    prevented: () => prevented,
    exited: () => exited,
  };
}

test("quitting waits for saving and ignores repeated quit attempts while saving", async () => {
  let finish!: () => void;
  let calls = 0;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const quit = await quitFixture(() => {
    calls++;
    return pending;
  });
  quit.app.quit();
  quit.app.quit();
  expect(quit.exited()).toBe(0);
  expect(quit.prevented()).toBe(2);
  expect(calls).toBe(1);
  finish();
  await new Promise((resolve) => setImmediate(resolve));
  expect(quit.exited()).toBe(1);
});

test("a save failure keeps the app open and lets the user retry quitting", async () => {
  let fail = true;
  const quit = await quitFixture(() =>
    fail ? Promise.reject(new Error("Disk full")) : Promise.resolve(),
  );
  quit.app.quit();
  await new Promise((resolve) => setImmediate(resolve));
  expect(quit.exited()).toBe(0);
  expect(String(quit.errors[0]![1])).toMatch(/Disk full/);
  fail = false;
  quit.app.quit();
  await new Promise((resolve) => setImmediate(resolve));
  expect(quit.exited()).toBe(1);
});
