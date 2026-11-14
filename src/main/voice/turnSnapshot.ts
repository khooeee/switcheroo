import * as path from "node:path";
import type { TranscriptTurn } from "../../shared/transcript";
import { clipText } from "../../shared/clipText";
import { isReminderTurn } from "../../shared/isReminderTurn";

/** What a running turn is doing right now: its latest tool call or assistant text. */
function currentStep(turn: TranscriptTurn): string {
  for (let i = turn.events.length - 1; i >= 0; i--) {
    const event = turn.events[i]!;
    if (event.role === "tool") return clipText(event.toolTitle ?? event.text, 120);
    if (event.role === "assistant" && event.text.trim()) return clipText(event.text, 200);
  }
  return turn.assistant?.text ? clipText(turn.assistant.text, 200) : "thinking";
}

/** Compact, speakable view of one turn; `replyMax` bounds the final message. */
export function turnSnapshot(turn: TranscriptTurn, replyMax: number) {
  if (isReminderTurn(turn)) return { reminder: clipText(turn.user.text, 200) };
  const files = [...new Set(turn.fileChanges.map((change) => path.basename(change.path)))];
  if (turn.status === "running") {
    return {
      status: "working",
      prompt: clipText(turn.user.text, 200),
      now: currentStep(turn),
      minutes: Math.max(0, Math.round((Date.now() - turn.at) / 60_000)),
    };
  }
  return {
    status: turn.status,
    prompt: clipText(turn.user.text, 200),
    reply: clipText(turn.assistant?.text ?? "", replyMax) || "(no reply)",
    ...(files.length ? { files: files.slice(0, 8), fileCount: files.length } : {}),
  };
}
