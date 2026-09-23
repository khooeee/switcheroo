import { useEffect, useState, type RefObject } from "react";
import { findTextRanges } from "./findTextRanges";

export function useFindMatches(rootRef: RefObject<HTMLDivElement | null>, query: string) {
  const [matches, setMatches] = useState<Range[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setIndex(0);
    const update = () => {
      const next = findTextRanges(root, query);
      CSS.highlights.set("find-matches", new Highlight(...next));
      setMatches(next);
      setIndex((previous) => Math.min(previous, Math.max(0, next.length - 1)));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => {
      observer.disconnect();
      CSS.highlights.delete("find-matches");
      CSS.highlights.delete("find-active");
    };
  }, [rootRef, query]);

  useEffect(() => {
    const range = matches[index];
    const highlight = new Highlight(...(range ? [range] : []));
    highlight.priority = 1;
    CSS.highlights.set("find-active", highlight);
    const root = rootRef.current;
    if (!range || !root) return;
    const rect = range.getBoundingClientRect();
    const viewport = root.getBoundingClientRect();
    if (rect.top < viewport.top || rect.bottom > viewport.bottom) {
      root.scrollTop += rect.top - viewport.top - root.clientHeight / 2 + rect.height / 2;
    }
  }, [matches, index, rootRef]);

  const go = (direction: 1 | -1) => {
    if (matches.length) setIndex((previous) => (previous + direction + matches.length) % matches.length);
  };
  return { count: matches.length, index, go };
}
