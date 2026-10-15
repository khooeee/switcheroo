import type { SwitchboardTurn } from "../shared/switchboardTurn";
import { encodeJsonl } from "./encodeJsonl";
import { readJsonlFile } from "./readJsonlFile";
import { switchboardPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

export function loadSwitchboardTurns(): Promise<SwitchboardTurn[]> {
  return readJsonlFile<SwitchboardTurn>(switchboardPath());
}

export async function saveSwitchboardTurns(turns: SwitchboardTurn[]): Promise<void> {
  await writeFileAtomic(switchboardPath(), encodeJsonl(turns));
}
