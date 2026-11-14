import type { ReactNode } from "react";

/** `text` with matched characters in <strong>; `positions` index the whole path, `offset` is where `text` starts in it. */
export function highlightMatches(text: string, offset: number, positions: readonly number[]): ReactNode {
  const matched = new Set(positions);
  const parts: ReactNode[] = [];
  let run = "";
  let runMatched = false;
  const flush = () => {
    if (run) parts.push(runMatched ? <strong key={parts.length}>{run}</strong> : run);
    run = "";
  };
  for (let i = 0; i < text.length; i++) {
    const isMatch = matched.has(offset + i);
    if (isMatch !== runMatched) flush();
    runMatched = isMatch;
    run += text[i];
  }
  flush();
  return parts;
}
