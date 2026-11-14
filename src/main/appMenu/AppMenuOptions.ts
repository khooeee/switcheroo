import type { BrowserWindow } from "electron";

/** Getters the application menu reads from the main process. */
export type AppMenuOptions = {
  getMainWindow: () => BrowserWindow | null;
  /** False in File Explorer mode, where Find in History is disabled. */
  getSessionsMode: () => boolean;
  getHasSessions: () => boolean;
};
