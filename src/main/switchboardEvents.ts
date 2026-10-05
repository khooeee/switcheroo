import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SwitchboardTurn } from "../shared/switchboardTurn";
import { encodeJsonl } from "./encodeJsonl";
import { parseJsonl } from "./parseJsonl";
import { switchboardPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

export async function loadSwitchboardTurns(): Promise<SwitchboardTurn[]> {
  try {
    const raw = await fs.readFile(switchboardPath(), "utf8");
    if (!raw.trim()) return [];
    return parseJsonl<SwitchboardTurn>(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveSwitchboardTurns(turns: SwitchboardTurn[]): Promise<void> {
  const target = switchboardPath();
  const tmp = `${target}.${process.pid}.tmp`;
  const body = encodeJsonl(turns);
  const save = pendingSave.then(async () => {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
