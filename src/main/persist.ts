import * as fs from "node:fs/promises";
import type { PersistedState } from "../shared/persistedState";
import { isMissingFile } from "./isMissingFile";
import { statePath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

let canPersist = true;

function parsePersistedState(parsed: unknown): PersistedState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as PersistedState;
  if (raw.version !== 1) return null;
  if (typeof raw.activeTabId !== "string") return null;
  if (!Array.isArray(raw.pinned) || !Array.isArray(raw.unpinned)) return null;
  return raw;
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) return null;
    const state = parsePersistedState(JSON.parse(raw));
    if (!state) {
      canPersist = false;
      return null;
    }
    return state;
  } catch (err) {
    if (!isMissingFile(err)) canPersist = false;
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  if (!canPersist) throw new Error("The saved state could not be loaded; preserving the existing file.");
  await writeFileAtomic(statePath(), JSON.stringify(state, null, 2));
}
