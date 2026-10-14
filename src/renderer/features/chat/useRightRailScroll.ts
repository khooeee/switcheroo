import { useLayoutEffect, type RefObject } from "react";
import { isScrolledToBottom } from "../sessions/isScrolledToBottom";
import { trackScrollPosition, type ScrollPosition } from "../sessions/trackScrollPosition";

/** Scroll intent of each tab's rail, and the selection it belonged to; this app run only. */
const saved = new Map<string, ScrollPosition & { focusKey: number }>();

/**
 * Put a tab's rail back where it was scrolled when switching back to that tab, and keep it
 * stuck to the bottom while a running turn streams in (like the main transcript).
 */
export function useRightRailScroll(
  tabId: string,
  focusKey: number,
  scrollRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let position = saved.get(tabId);
    if (position?.focusKey !== focusKey) {
      // A new selection keeps the current offset, as before; flashing its focus event scrolls to it.
      position = { focusKey, top: element.scrollTop, pinned: isScrolledToBottom(element) };
      saved.set(tabId, position);
    }
    return trackScrollPosition(element, position);
  }, [tabId, focusKey, scrollRef]);
}
