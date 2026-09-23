import { app } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PersistedState } from "../shared/types";

let canPersist = true;
let pendingSave: Promise<void> = Promise.resolve();

function statePath(): string {
  return path.join(app.getPath("userData"), "switcheroo-state.json");
}

export async function loadState(): Promise<PersistedState | null> {
  const target = statePath();
  try {
    const raw = await fs.readFile(target, "utf8");
    if (!raw.trim()) return null;
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
