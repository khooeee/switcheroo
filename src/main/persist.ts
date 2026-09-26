import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ActiveTabId,
  AgentKind,
  MasterEvent,
  PersistedState,
  SlashCommand,
  TranscriptItem,
} from "../shared/types";
import { MASTER_TAB_ID } from "../shared/types";
import { saveSessionMeta, type SessionMeta } from "./sessionMeta";
import { saveSessionNotes } from "./sessionNotes";
import { relocateFlatTranscript, saveAllTranscripts } from "./sessionTranscripts";
import { saveSwitchboardEvents } from "./switchboardEvents";
import { statePath } from "./userDataPaths";

let canPersist = true;
let pendingSave: Promise<void> = Promise.resolve();

interface LegacyTab {
  id: string;
  title: string;
  agentKind: AgentKind;
  cwd: string;
  sessionId: string | null;
  closed?: boolean;
  notes?: string;
  notesWidth?: number;
  slashCommands?: SlashCommand[];
}

interface LegacyV1 {
  version: 1;
  activeTabId: ActiveTabId;
  tabs: LegacyTab[];
  transcripts?: Record<string, TranscriptItem[]>;
  masterEvents?: MasterEvent[];
}

interface LegacyV2 {
  version: 2;
  activeTabId: ActiveTabId;
  tabs: LegacyTab[];
  masterEvents?: MasterEvent[];
}

interface LegacyV3 {
  version: 3;
  activeTabId: ActiveTabId;
  tabs: LegacyTab[];
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as LegacyV1 | LegacyV2 | LegacyV3 | PersistedState;
    if (parsed.version === 1) return migrateV1(parsed);
    if (parsed.version === 2) return migrateV2(parsed);
    if (parsed.version === 3) return migrateV3(parsed);
    if (parsed.version !== 4) {
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
  return writeSessionFolders(legacy.activeTabId, legacy.tabs);
}

async function migrateV2(legacy: LegacyV2): Promise<PersistedState> {
  await saveSwitchboardEvents(legacy.masterEvents ?? []);
  return writeSessionFolders(legacy.activeTabId, legacy.tabs);
}

async function migrateV3(legacy: LegacyV3): Promise<PersistedState> {
  return writeSessionFolders(legacy.activeTabId, legacy.tabs);
}

async function writeSessionFolders(
  activeTabId: ActiveTabId,
  tabs: LegacyTab[],
): Promise<PersistedState> {
  const openIds: string[] = [];
  for (const tab of tabs) {
    await relocateFlatTranscript(tab.id);
    const meta: SessionMeta = {
      title: tab.title,
      agentKind: tab.agentKind,
      cwd: tab.cwd,
      sessionId: tab.sessionId,
      notesWidth: tab.notesWidth,
      slashCommands: tab.slashCommands,
    };
    await saveSessionMeta(tab.id, meta);
    if (tab.notes) await saveSessionNotes(tab.id, tab.notes);
    if (!tab.closed) openIds.push(tab.id);
  }
  const nextActive =
    activeTabId === MASTER_TAB_ID || openIds.includes(activeTabId) ? activeTabId : MASTER_TAB_ID;
  const next: PersistedState = { version: 4, activeTabId: nextActive, tabs: openIds };
  await saveState(next);
  return next;
}
