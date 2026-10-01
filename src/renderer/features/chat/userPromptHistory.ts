import type { TranscriptItem } from "../../../shared/types";

/** Newest-first non-empty user prompts from the session transcript. */
export function userPromptHistory(items: TranscriptItem[]): string[] {
  const out: string[] = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item?.role !== "user") continue;
    const text = item.text.trimEnd();
    if (text) out.push(text);
  }
  return out;
}
