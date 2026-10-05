import type { TranscriptTurn } from "../../../shared/transcript";
import { shareTurn } from "./shareTurn";

/** Replace (with structural sharing) or append a turn by id. Returns `list` when nothing changed. */
export function upsertTurn<T extends TranscriptTurn>(list: readonly T[], turn: T): T[] {
  const index = list.findIndex((entry) => entry.id === turn.id);
  if (index < 0) return [...list, turn];
  const shared = shareTurn(list[index]!, turn);
  if (shared === list[index]) return list as T[];
  const next = list.slice();
  next[index] = shared;
  return next;
}
