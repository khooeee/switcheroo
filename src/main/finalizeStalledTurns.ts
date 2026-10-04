import type { TranscriptTurn } from "../shared/types";

/** After restart, in-flight turns cannot resume — mark them stopped. */
export function finalizeStalledTurns<T extends TranscriptTurn>(turns: T[]): T[] {
  let changed = false;
  const next = turns.map((turn) => {
    if (turn.status !== "running") return turn;
    changed = true;
    const { queued: _queued, ...user } = turn.user;
    return { ...turn, user, status: "stopped" as const };
  });
  return changed ? next : turns;
}
