import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MasterEvent, PersistedState, TranscriptItem } from "../shared/types";
import { saveAllTranscripts } from "./sessionTranscripts";
import { saveSwitchboardEvents } from "./switchboardEvents";
import { statePath } from "./userDataPaths";

let canPersist = true;
let pendingSave: Promise<void> = Promise.resolve();

interface LegacyV1 {
  version: 1;
  activeTabId: PersistedState["activeTabId"];
  tabs: PersistedState["tabs"];
  transcripts?: Record<string, TranscriptItem[]>;
  masterEvents?: MasterEvent[];
}

interface LegacyV2 {
  version: 2;
  activeTabId: PersistedState["activeTabId"];
  tabs: PersistedState["tabs"];
  masterEvents?: MasterEvent[];
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as LegacyV1 | LegacyV2 | PersistedState;
    if (parsed.version === 1) return migrateV1(parsed);
    if (parsed.version === 2) return migrateV2(parsed);
    if (parsed.version !== 3) {
      canPersist = false;
      return null;
    }
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") canPersist = false;
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  if (!canPersist) throw new Error("The saved state could not be loaded; preserving the existing file.");
  const target = statePath();
  const tmp = `${target}.${process.pid}.tmp`;
  const snapshot = JSON.stringify(state, null, 2);
  const save = pendingSave.then(async () => {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(tmp, snapshot, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}

async function migrateV1(legacy: LegacyV1): Promise<PersistedState> {
  await saveAllTranscripts(legacy.transcripts ?? {});
  await saveSwitchboardEvents(legacy.masterEvents ?? []);
  return writeV3(legacy.activeTabId, legacy.tabs);
}

async function migrateV2(legacy: LegacyV2): Promise<PersistedState> {
  await saveSwitchboardEvents(legacy.masterEvents ?? []);
  return writeV3(legacy.activeTabId, legacy.tabs);
}

async function writeV3(
  activeTabId: PersistedState["activeTabId"],
  tabs: PersistedState["tabs"],
): Promise<PersistedState> {
  const next: PersistedState = { version: 3, activeTabId, tabs };
  await saveState(next);
  return next;
}
