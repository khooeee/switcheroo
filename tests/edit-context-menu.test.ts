import { test, expect, vi } from "vitest";

const built: Electron.MenuItemConstructorOptions[][] = [];
const copied: string[] = [];

vi.mock("electron", () => ({
  clipboard: { writeText: (text: string) => copied.push(text) },
  Menu: {
    buildFromTemplate: (items: Electron.MenuItemConstructorOptions[]) => {
      built.push(items);
      return { popup: () => {} };
    },
  },
}));

const win = { isDestroyed: () => false, webContents: { send: () => {} } } as unknown as Electron.BrowserWindow;

test("Copy Code sits between Copy and Copy Message and copies only the code", async () => {
  const { showEditContextMenu } = await import("../src/main/showEditContextMenu");
  showEditContextMenu(win, { code: "npm test", markdown: "Run:\n\n```sh\nnpm test\n```", canFind: true });
  const items = built.at(-1)!;
  expect(items.map((item) => item.role ?? item.label ?? item.type)).toEqual([
    "copy",
    "Copy Code",
    "Copy Message",
    "separator",
    "Find in Message",
  ]);
  (items[1].click as () => void)();
  expect(copied.at(-1)).toBe("npm test");
});

test("Copy Code is omitted outside code blocks", async () => {
  const { showEditContextMenu } = await import("../src/main/showEditContextMenu");
  showEditContextMenu(win, { markdown: "hi" });
  expect(built.at(-1)!.map((item) => item.label)).not.toContain("Copy Code");
});
