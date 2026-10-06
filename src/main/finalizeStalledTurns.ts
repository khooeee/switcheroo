import type { TranscriptTurn } from "../shared/transcript";

/** After restart, in-flight turns cannot resume — mark them stopped. */
export function finalizeStalledTurns<T extends TranscriptTurn>(turns: T[]): T[] {
  let changed = false;
  const next = turns.map((turn) => {
    if (turn.status !== "running") return turn;
    changed = true;
    const { queued: _queued, ...user } = turn.user;
    // Subagents cannot report back across a restart either.
    const events = turn.events.map((event) =>
      event.role === "subagent" && event.toolStatus === "running"
        ? { ...event, toolStatus: "disconnected" }
        : event);
    return { ...turn, user, events, status: "stopped" as const };
  });
  return changed ? next : turns;
}
