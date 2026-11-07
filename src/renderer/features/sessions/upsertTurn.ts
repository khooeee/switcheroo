import type { TranscriptTurn } from "../../../shared/transcript";
import { shareTurn } from "./shareTurn";

/** Replace (with structural sharing) or append a turn by id. Returns `list` when nothing changed. */
export function upsertTurn(list: TranscriptTurn[], turn: TranscriptTurn): TranscriptTurn[] {
  const index = list.findIndex((entry) => entry.id === turn.id);
  if (index < 0) return [...list, turn];
  const shared = shareTurn(list[index]!, turn);
  if (shared === list[index]) return list;
  const next = list.slice();
  next[index] = shared;
  return next;
}
