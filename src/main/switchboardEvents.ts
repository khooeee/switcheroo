import * as fs from "node:fs/promises";
import type { SwitchboardTurn } from "../shared/switchboardTurn";
import { encodeJsonl } from "./encodeJsonl";
import { isMissingFile } from "./isMissingFile";
import { parseJsonl } from "./parseJsonl";
import { switchboardPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

export async function loadSwitchboardTurns(): Promise<SwitchboardTurn[]> {
  try {
    const raw = await fs.readFile(switchboardPath(), "utf8");
    if (!raw.trim()) return [];
    return parseJsonl<SwitchboardTurn>(raw);
  } catch (err) {
    if (isMissingFile(err)) return [];
    throw err;
  }
}

export async function saveSwitchboardTurns(turns: SwitchboardTurn[]): Promise<void> {
  await writeFileAtomic(switchboardPath(), encodeJsonl(turns));
}
