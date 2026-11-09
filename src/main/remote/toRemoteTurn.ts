import type { TranscriptTurn } from "../../shared/transcript";
import type { RemoteTurn } from "./RemoteTurn";

function latestActivity(turn: TranscriptTurn): string | undefined {
  const last = turn.events.at(-1);
  if (!last) return undefined;
  if (last.role === "thought") return "Thinking";
  return last.toolTitle || undefined;
}

/** Drop events and file diffs so streaming a turn to a phone stays small. */
export function toRemoteTurn(turn: TranscriptTurn): RemoteTurn {
  return {
    id: turn.id,
    at: turn.at,
    status: turn.status,
    user: turn.user.text,
    queued: turn.user.queued || undefined,
    assistant: turn.assistant?.text ?? null,
    activity: turn.status === "running" ? latestActivity(turn) : undefined,
  };
}
