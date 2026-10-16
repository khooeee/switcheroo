import { defaultAppSettings } from "../../shared/defaultAppSettings";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { openOrCreateFile } from "./openOrCreateFile";
import { statePath } from "../storage/userDataPaths";

const EMPTY_STATE = JSON.stringify(
  {
    version: 1,
    activeTabId: SWITCHBOARD_ID,
    settings: defaultAppSettings(),
    pinned: [],
    unpinned: [],
  },
  null,
  2,
);

/** Open switcheroo.json in the default app (create an empty state file if missing). */
export function openSettingsFile(): Promise<void> {
  return openOrCreateFile(statePath(), `${EMPTY_STATE}\n`);
}
