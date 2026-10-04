import { test, expect, vi, beforeEach, afterEach } from "vitest";

const { state } = vi.hoisted(() => ({
  state: {
    exists: true,
    failures: [] as Array<{ code: string | number } | null | undefined>,
    gitToplevel: null as string | null,
    calls: [] as { command: string; args: string[]; options: unknown }[],
  },
}));

vi.mock("node:fs/promises", () => ({
  stat: async () => ({ isFile: () => state.exists }),
}));

vi.mock("node:os", () => ({
  homedir: () => "/Users/test",
}));

vi.mock("node:child_process", () => ({
  execFile(
    command: string,
    args: string[],
    options: unknown,
    callback: (error: Error | null, stdout?: string) => void,
  ) {
    if (command === "git") {
      if (state.gitToplevel) callback(null, `${state.gitToplevel}\n`);
      else callback(Object.assign(new Error("not a git repo"), { code: 128 }));
      return;
    }
    state.calls.push({ command, args: Array.from(args), options });
    callback((state.failures[state.calls.length - 1] as Error | null) ?? null);
  },
}));

import { openInCursor } from "../src/main/openInCursor";

const originalPlatform = process.platform;

beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
});

afterEach(() => {
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
});

function fixture({
  exists = true,
  failures = [] as Array<{ code: string | number } | null | undefined>,
  gitToplevel = null as string | null,
} = {}) {
  state.exists = exists;
  state.failures = failures;
  state.gitToplevel = gitToplevel;
  state.calls.length = 0;
  return { open: openInCursor, calls: state.calls };
}

test("opens the exact workspace and file using arguments, including spaces and shell characters", async () => {
  const f = fixture();
  await f.open("/project folder", "src/a $(echo nope).ts");
  expect(f.calls).toHaveLength(1);
  expect(f.calls[0].args).toEqual(["/project folder", "--goto", "/project folder/src/a $(echo nope).ts"]);
  expect((f.calls[0].options as { shell?: boolean }).shell).toBeUndefined();
});

test("falls back to an installed Cursor launcher when GUI PATH omits it", async () => {
  const f = fixture({ failures: [{ code: "ENOENT" }] });
  await f.open("/project", "/project/file.ts");
  expect(f.calls[1].command).toBe("/Users/test/.local/bin/cursor");
});

test("rejects missing and invalid paths before launching", async () => {
  const missing = fixture({ exists: false });
  await expect(missing.open("/project", "deleted.ts")).rejects.toThrow(/no longer exists/);
  expect(missing.calls).toHaveLength(0);
  const f = fixture();
  for (const file of ["", "bad\0path"]) {
    await expect(f.open("/project", file)).rejects.toThrow();
  }
  expect(f.calls).toHaveLength(0);
});

test("opens files outside the project without a workspace folder", async () => {
  const f = fixture();
  await f.open("/project", "../outside.ts");
  expect(f.calls[0].args).toEqual(["--goto", "/outside.ts"]);
  await f.open("/project", "/project-other/file.ts");
  expect(f.calls[1].args).toEqual(["--goto", "/project-other/file.ts"]);
});

test("opens files in another git worktree using that worktree root", async () => {
  const f = fixture({ gitToplevel: "/worktrees/switcheroo/feature" });
  await f.open("/project", "/worktrees/switcheroo/feature/src/a.ts");
  expect(f.calls[0].args).toEqual([
    "/worktrees/switcheroo/feature",
    "--goto",
    "/worktrees/switcheroo/feature/src/a.ts",
  ]);
});

test("reports missing Cursor and launch failures instead of silently succeeding", async () => {
  const missing = fixture({ failures: Array(6).fill({ code: "ENOENT" }) });
  await expect(missing.open("/project", "a.ts")).rejects.toThrow(/Cursor was not found/);
  const failed = fixture({ failures: [{ code: 1 }] });
  await expect(failed.open("/project", "a.ts")).rejects.toThrow(/could not open/);
  expect(failed.calls).toHaveLength(1);
});
