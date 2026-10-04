import { test, expect } from "vitest";
import { insertPromptPaths } from "../src/renderer/features/chat/insertPromptPaths";
import { pasteImageFiles } from "../src/renderer/features/chat/pasteImageFiles";

test("inserts quoted paths at the caret with spacing", () => {
  const mid = insertPromptPaths("look at this", 8, 8, ["/tmp/.switcheroo/pastes/a.png"]);
  expect(mid.value).toBe("look at /tmp/.switcheroo/pastes/a.png this");
  const spaced = insertPromptPaths("", 0, 0, ["/tmp/my shot.png"]);
  expect(spaced.value).toBe(`"/tmp/my shot.png"`);
  expect(spaced.cursor).toBe(spaced.value.length);
});

test("collects image files from a paste payload", () => {
  const png = { type: "image/png", name: "clip.png" } as File;
  const fromItems = pasteImageFiles({
    items: [{ kind: "file", type: "image/png", getAsFile: () => png }],
    files: [],
  } as unknown as DataTransfer);
  expect(fromItems.length).toBe(1);
  expect(fromItems[0]).toBe(png);
  const fromFiles = pasteImageFiles({
    items: [],
    files: [png, { type: "text/plain" }],
  } as unknown as DataTransfer);
  expect(fromFiles.length).toBe(1);
  expect(fromFiles[0]).toBe(png);
  expect(pasteImageFiles(null).length).toBe(0);
});
