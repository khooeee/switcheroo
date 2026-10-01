import * as fs from "node:fs/promises";
import * as path from "node:path";
import { shell } from "electron";
import { SWITCHBOARD_ID, defaultAppSettings } from "../shared/types";
import { statePath } from "./userDataPaths";

const EMPTY_STATE = JSON.stringify(
  {
    version: 1,
    activeSessionId: SWITCHBOARD_ID,
    settings: defaultAppSettings(),
    pinned: [],
    unpinned: [],
  },
  null,
  2,
);

/** Open switcheroo.json in the default app (create an empty state file if missing). */
export async function openSettingsFile(): Promise<void> {
  const target = statePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.access(target);
  } catch {
    await fs.writeFile(target, `${EMPTY_STATE}\n`, "utf8");
  }
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
}
