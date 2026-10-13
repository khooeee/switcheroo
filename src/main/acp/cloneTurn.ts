import type { TranscriptTurn } from "../../shared/transcript";

/** Copy a turn deeply enough that edits to the copy never reach the original. */
export function cloneTurn(turn: TranscriptTurn): TranscriptTurn {
  return {
    ...turn,
    user: { ...turn.user },
    assistant: turn.assistant ? { ...turn.assistant } : null,
    events: turn.events.map((event) => ({ ...event })),
    fileChanges: turn.fileChanges.map((change) => ({ ...change })),
  };
}
