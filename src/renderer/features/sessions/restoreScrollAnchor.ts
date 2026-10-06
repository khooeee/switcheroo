import type { ScrollAnchor } from "./captureScrollAnchor";

/** Scroll so the anchored message is back at the top of the viewport; false when it is not rendered. */
export function restoreScrollAnchor(element: HTMLElement, anchor: ScrollAnchor): boolean {
  const item = [...element.querySelectorAll<HTMLElement>("[data-event-id]")]
    .find((entry) => entry.dataset.eventId === anchor.id);
  if (!item) return false;
  const rect = item.getBoundingClientRect();
  element.scrollTop += rect.top + anchor.ratio * rect.height - element.getBoundingClientRect().top;
  return true;
}
