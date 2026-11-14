import { fuzzyMatch } from "./fuzzyMatch";
import type { PathEntry } from "./PathEntry";
import type { RankedEntry } from "./RankedEntry";

const LIMIT = 100;

/**
 * Best matches for `query`, best first. A match inside the name beats one spread over the path,
 * more so from the name's first letter or for the whole name; ties go to files, then to the shorter path.
 */
export function rankEntries(entries: readonly PathEntry[], query: string): RankedEntry[] {
  const needle = query.replace(/\s+/g, "").toLowerCase();
  if (!needle) return [];
  const hits: Array<RankedEntry & { score: number }> = [];
  for (const entry of entries) {
    const inName = needle.includes("/") ? null : fuzzyMatch(entry.path, entry.lower, needle, entry.nameStart);
    const match = inName ?? fuzzyMatch(entry.path, entry.lower, needle);
    if (!match) continue;
    let score = match.score;
    if (inName) score += 1000;
    if (inName?.positions[0] === entry.nameStart) score += 20;
    if (inName && entry.path.length - entry.nameStart === needle.length) score += 50;
    if (entry.kind === "file") score += 1;
    hits.push({ entry, positions: match.positions, score });
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.path.length - b.entry.path.length ||
      (a.entry.path < b.entry.path ? -1 : 1),
  );
  return hits.slice(0, LIMIT);
}
