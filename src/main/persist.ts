import { app } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PersistedState } from "../shared/types";

let canPersist = true;

function statePath(): string {
  return path.join(app.getPath("userData"), "switcheroo-state.json");
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) {
      canPersist = false;
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1) {
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
  if (!canPersist) return;
  const target = statePath();
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, target);
}
