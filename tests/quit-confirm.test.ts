import { test, expect, vi, beforeEach } from "vitest";

const electron = vi.hoisted(() => ({
  beforeQuit: null as null | ((event: { preventDefault: () => void }) => void),
  quit: vi.fn(),
  showMessageBox: vi.fn(),
  showErrorBox: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    on: (name: string, handler: typeof electron.beforeQuit) => {
      if (name === "before-quit") electron.beforeQuit = handler;
    },
    quit: electron.quit,
  },
  dialog: { showMessageBox: electron.showMessageBox, showErrorBox: electron.showErrorBox },
}));

beforeEach(() => {
  electron.beforeQuit = null;
  electron.quit.mockReset();
  electron.showMessageBox.mockReset();
  electron.showErrorBox.mockReset();
});

const fireQuit = () => {
  const preventDefault = vi.fn();
  electron.beforeQuit!({ preventDefault });
  return preventDefault;
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("warning names running chats and live terminals, or nothing when idle", async () => {
  const { quitWarningDetail } = await import("../src/main/quitWarningDetail");
  expect(quitWarningDetail({ runningChats: 0, openTerminals: 0 })).toBeNull();
  expect(quitWarningDetail({ runningChats: 1, openTerminals: 0 })).toBe(
    "1 chat is still running. Quitting will stop it.",
  );
  expect(quitWarningDetail({ runningChats: 0, openTerminals: 3 })).toBe(
    "3 terminals are open. Quitting will stop them.",
  );
  expect(quitWarningDetail({ runningChats: 2, openTerminals: 1 })).toBe(
    "2 chats are still running and 1 terminal is open. Quitting will stop them.",
  );
});

test("idle quit skips the dialog", async () => {
  const { confirmQuit } = await import("../src/main/confirmQuit");
  expect(await confirmQuit(null, { runningChats: 0, openTerminals: 0 })).toBe(true);
  expect(electron.showMessageBox).not.toHaveBeenCalled();
});

test("busy quit asks, and Cancel keeps the app open", async () => {
  const { confirmQuit } = await import("../src/main/confirmQuit");
  electron.showMessageBox.mockResolvedValueOnce({ response: 1 });
  expect(await confirmQuit(null, { runningChats: 1, openTerminals: 0 })).toBe(false);
  expect(electron.showMessageBox.mock.calls[0][0]).toMatchObject({
    message: "Quit Switcheroo?",
    buttons: ["Quit", "Cancel"],
    cancelId: 1,
  });
});

test("declined quit does not save; a later confirmed quit saves once, then quits", async () => {
  const { installQuitHandler } = await import("../src/main/installQuitHandler");
  const confirm = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false).mockResolvedValue(true);
  const save = vi.fn(async () => {});
  installQuitHandler(confirm, save);

  expect(fireQuit()).toHaveBeenCalled();
  await settle();
  expect(save).not.toHaveBeenCalled();
  expect(electron.quit).not.toHaveBeenCalled();

  fireQuit();
  fireQuit(); // repeated Cmd+Q while the dialog is up is ignored
  await settle();
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenCalledTimes(1);
  expect(electron.quit).toHaveBeenCalledTimes(1);
  expect(fireQuit()).not.toHaveBeenCalled(); // the app.quit() pass goes through
});
