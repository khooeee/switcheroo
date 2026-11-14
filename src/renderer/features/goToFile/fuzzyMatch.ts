import type { FuzzyHit } from "./FuzzyHit";

const SEPARATORS = new Set(["/", "\\", "_", "-", ".", " "]);

/** A character that starts a word: first in `text`, after a separator, or a camelCase hump. */
function startsWord(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  if (SEPARATORS.has(prev)) return true;
  const char = text[index];
  return prev === prev.toLowerCase() && char !== char.toLowerCase();
}

/**
 * Match `needle` (lowercase) as a subsequence of `text` at or after `from`; `lower` is `text`
 * lowercased at the same offsets. Finds the first full match, then walks back from its end for the tightest span.
 * Runs of adjacent characters and word starts score up; gaps score down.
 */
export function fuzzyMatch(text: string, lower: string, needle: string, from = 0): FuzzyHit | null {
  let end = from - 1;
  for (let n = 0; n < needle.length; n++) {
    end = lower.indexOf(needle[n], end + 1);
    if (end < 0) return null;
  }

  const positions = new Array<number>(needle.length);
  let at = end;
  for (let n = needle.length - 1; n >= 0; n--) {
    at = lower.lastIndexOf(needle[n], at);
    positions[n] = at;
    at -= 1;
  }

  let score = 0;
  for (let n = 0; n < positions.length; n++) {
    const index = positions[n];
    score += 16;
    if (startsWord(text, index)) score += 8;
    if (n === 0) continue;
    const gap = index - positions[n - 1] - 1;
    score += gap === 0 ? 8 : -Math.min(gap, 6);
  }
  return { score, positions };
}
