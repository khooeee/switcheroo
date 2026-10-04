import fs from "node:fs";
import path from "node:path";
import { test, expect, vi } from "vitest";

const { tempRoot } = vi.hoisted(() => ({
  tempRoot: { value: "" },
}));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    tmpdir: () => tempRoot.value,
  };
});

import { savePastedImage } from "../src/main/savePastedImage";

function makeTempRoot() {
  return fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "switcheroo-paste-"));
}

test("writes the image under a global temp folder and returns an absolute path", async () => {
  tempRoot.value = makeTempRoot();
  const dest = await savePastedImage(Buffer.from([137, 80, 78, 71]), "image/png");
  expect(dest).toBe(path.join(tempRoot.value, "switcheroo", "pastes", path.basename(dest)));
  expect(path.basename(dest)).toMatch(/^paste-.*\.png$/);
  expect(fs.readFileSync(dest)[0]).toBe(137);
});

test("maps jpeg mime types and rejects empty or huge payloads", async () => {
  tempRoot.value = makeTempRoot();
  const dest = await savePastedImage(Buffer.from([1, 2, 3]), "image/jpeg");
  expect(dest).toMatch(/\.jpg$/);
  await expect(savePastedImage(Buffer.alloc(0), "image/png")).rejects.toThrow(/empty/);
  await expect(savePastedImage(Buffer.alloc(20 * 1024 * 1024 + 1), "image/png")).rejects.toThrow(/too large/);
});
