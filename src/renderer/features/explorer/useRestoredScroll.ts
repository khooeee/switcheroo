import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

interface ScrollPositions {
  get(key: string): number | undefined;
  set(key: string, top: number): void;
}

/**
 * Keep `positions[key]` in step with the element's scroll offset, and put it back when `key`
 * changes. Content may arrive later (folders loading), so the restore retries on each
 * `contentVersion` until the offset fits.
 */
export function useRestoredScroll(
  key: string,
  scrollRef: RefObject<HTMLElement | null>,
  contentVersion: unknown,
  positions: ScrollPositions,
): void {
  const pending = useRef<number | null>(null);

  useLayoutEffect(() => {
    pending.current = positions.get(key) ?? 0;
  }, [key, positions]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    const target = pending.current;
    if (!element || target === null) return;
    element.scrollTop = target;
    if (Math.abs(element.scrollTop - target) < 1) pending.current = null;
  }, [key, contentVersion, scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      if (pending.current === null) positions.set(key, element.scrollTop);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [key, scrollRef, positions]);
}
