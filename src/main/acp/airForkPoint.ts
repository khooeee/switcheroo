import { createHash } from "node:crypto";
import type { TranscriptItem, TranscriptTurn } from "../../shared/types";

/** `_meta.jetbrains.air.fork` on `session/fork`; claude-agent-acp and codex-acp truncate history there. */
export interface AirForkPoint {
  /** ACP messageId the agent streamed; assistant transcript items reuse it as their id. */
  messageId: string;
  /** Lets the agent find the message when the id is unknown (e.g. recorded before adapters sent ids). */
  messageFingerprint: string;
  /** 1-based: which assistant message with this text, counting from the start. */
  messageOccurrence: number;
}

/** Assistant messages in order; `turn.assistant` is the newest of its turn. */
function assistantItems(turns: TranscriptTurn[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const turn of turns) {
    for (const event of turn.events) {
      if (event.role === "assistant") items.push(event);
    }
    if (turn.assistant) items.push(turn.assistant);
  }
  return items;
}

/** Fork point at the last assistant message of a clipped transcript; undefined when there is none. */
export function airForkPoint(turns: TranscriptTurn[]): AirForkPoint | undefined {
  const items = assistantItems(turns);
  const last = items.at(-1);
  if (!last) return undefined;
  return {
    messageId: last.id,
    messageFingerprint: `sha256:${createHash("sha256").update(last.text, "utf8").digest("hex")}`,
    messageOccurrence: items.filter((item) => item.text === last.text).length,
  };
}
