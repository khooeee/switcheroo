import type { TranscriptTurn } from "../../../shared/transcript";
import { turnMarkdown } from "./turnMarkdown";

/** Whole turns as one markdown document under an optional `# title`, with `---` between turns. */
export function turnsMarkdown(
  turns: TranscriptTurn[],
  { agent, title, userLabel }: { agent?: string; title?: string; userLabel?: string },
): string {
  const body = turns.map((turn) => turnMarkdown(turn, { agent, userLabel })).join("\n\n---\n\n");
  return `${title ? `# ${title}\n\n` : ""}${body}\n`;
}
