import { useEffect, useRef, useState, type RefObject } from "react";
import { findTextRanges } from "./findTextRanges";

/** Find in one or more roots (e.g. transcript + right rail). */
export function useFindMatches(
  rootRefs: Array<RefObject<HTMLElement | null>>,
  query: string,
  /** Bump when a root mounts/unmounts (e.g. right rail open). */
  rootsKey = 0,
) {
  const [matches, setMatches] = useState<Range[]>([]);
  const [index, setIndex] = useState(0);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    const roots = rootRefs
      .map((ref) => ref.current)
      .filter((node): node is HTMLElement => !!node);
    if (!roots.length) return;
    shouldScrollRef.current = true;
    setIndex(0);
    const update = () => {
      const next = roots.flatMap((root) => findTextRanges(root, query));
      next.sort((a, b) => a.compareBoundaryPoints(Range.START_TO_START, b));
      CSS.highlights.set("find-matches", new Highlight(...next));
      setMatches(next);
      setIndex((previous) => Math.min(previous, Math.max(0, next.length - 1)));
    };
    update();
    const observer = new MutationObserver(() => {
      shouldScrollRef.current = false;
      update();
    });
    for (const root of roots) {
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    }
    return () => {
      observer.disconnect();
      CSS.highlights.delete("find-matches");
      CSS.highlights.delete("find-active");
    };
    // rootRefs is stable from the caller; rootsKey covers mount changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, rootsKey]);

  useEffect(() => {
    const range = matches[index];
    const highlight = new Highlight(...(range ? [range] : []));
    highlight.priority = 1;
    CSS.highlights.set("find-active", highlight);
    if (!shouldScrollRef.current || !range) return;
    shouldScrollRef.current = false;
    scrollRangeIntoView(range);
  }, [matches, index]);

  const go = (direction: 1 | -1) => {
    if (!matches.length) return;
    shouldScrollRef.current = true;
    setIndex((previous) => (previous + direction + matches.length) % matches.length);
  };
  return { count: matches.length, index, go };
}

function scrollRangeIntoView(range: Range): void {
  const node = range.startContainer;
  const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as Element | null;
  const scroller = el?.closest(".scroll, .right-rail-scroll") as HTMLElement | null;
  if (!scroller) {
    el?.scrollIntoView({ block: "center", inline: "nearest" });
    return;
  }
  const rect = range.getBoundingClientRect();
  const viewport = scroller.getBoundingClientRect();
  if (rect.top < viewport.top || rect.bottom > viewport.bottom) {
    scroller.scrollTop +=
      rect.top - viewport.top - scroller.clientHeight / 2 + rect.height / 2;
  }
}
