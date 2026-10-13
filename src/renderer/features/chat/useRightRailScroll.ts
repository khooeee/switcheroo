import { useLayoutEffect, type RefObject } from "react";

/** Last scroll offset of each tab's rail, and the selection it belonged to; this app run only. */
const saved = new Map<string, { focusKey: number; top: number }>();

/** Put a tab's rail back where it was scrolled when switching back to that tab. */
export function useRightRailScroll(
  tabId: string,
  focusKey: number,
  scrollRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    // A new selection keeps the current offset, as before; flashing its focus event scrolls to it.
    const last = saved.get(tabId);
    if (last?.focusKey === focusKey) element.scrollTop = last.top;
    const save = () => saved.set(tabId, { focusKey, top: element.scrollTop });
    save();
    element.addEventListener("scroll", save, { passive: true });
    return () => element.removeEventListener("scroll", save);
  }, [tabId, focusKey, scrollRef]);
}
