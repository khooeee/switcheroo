import type { BrowserWindow } from "electron";
import type { SessionPinMenuState } from "../menuState/sessionPinMenuState";

/** Getters and actions the application menu reads from the main process. */
export type AppMenuOptions = {
  getMainWindow: () => BrowserWindow | null;
  getPinMenuState: () => SessionPinMenuState;
  getRenameEnabled: () => boolean;
  getOpenInCursorEnabled: () => boolean;
  openActiveInCursor: () => void;
  getUnreadEnabled: () => boolean;
  getForkEnabled: () => boolean;
  getStopEnabled: () => boolean;
  getNewTerminalEnabled: () => boolean;
  getActiveUnread: () => boolean;
};
