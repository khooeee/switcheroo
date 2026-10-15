import type { BrowserWindow } from "electron";
import type { SessionMenuState } from "../menuState/SessionMenuState";

/** Getters and actions the application menu reads from the main process. */
export type AppMenuOptions = {
  getMainWindow: () => BrowserWindow | null;
  getMenuState: () => SessionMenuState;
  openActiveInCursor: () => void;
  getActiveUnread: () => boolean;
};
