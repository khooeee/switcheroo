/** A query found in a path: higher scores are better; `positions` index the matched characters. */
export interface FuzzyHit {
  score: number;
  positions: number[];
}
