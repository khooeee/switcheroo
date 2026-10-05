import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ActiveTabId, PersistedState } from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { statePath } from "./userDataPaths";

let canPersist = true;
let pendingSave: Promise<void> = Promise.resolve();

/** Accept legacy `activeSessionId` and normalize to `activeTabId`. */
export function normalizePersistedState(parsed: unknown): PersistedState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as PersistedState & { activeSessionId?: ActiveTabId };
  if (raw.version !== 1) return null;
  const activeTabId =
    typeof raw.activeTabId === "string"
      ? raw.activeTabId
      : typeof raw.activeSessionId === "string"
        ? raw.activeSessionId
        : SWITCHBOARD_ID;
  return {
    version: 1,
    activeTabId,
    settings: raw.settings,
    pinned: Array.isArray(raw.pinned) ? raw.pinned.filter((id): id is string => typeof id === "string") : [],
    unpinned: Array.isArray(raw.unpinned)
      ? raw.unpinned.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) return null;
    const normalized = normalizePersistedState(JSON.parse(raw));
    if (!normalized) {
      canPersist = false;
      return null;
    }
    return normalized;
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
