import type { TranscriptTurn } from "../../../shared/transcript";

/** Newest-first non-empty user prompts from the session transcript. */
export function userPromptHistory(turns: TranscriptTurn[]): string[] {
  const out: string[] = [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const text = turns[i]?.user.text.trimEnd();
    if (text) out.push(text);
  }
  return out;
}
