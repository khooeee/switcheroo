import type { PathEntry } from "./PathEntry";

/** One Go to File result and the characters of its path the query matched. */
export interface RankedEntry {
  entry: PathEntry;
  positions: readonly number[];
}
