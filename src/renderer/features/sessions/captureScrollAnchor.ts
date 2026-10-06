/** A message near the top of a transcript viewport, so re-wrapped text can be scrolled back to it. */
export type ScrollAnchor = {
  /** `data-event-id` of the message. */
  id: string;
  /** How far into the message the viewport starts (0 = its top edge, 1 = its bottom edge). */
  ratio: number;
  /** Viewport width when captured; text wraps differently at other widths. */
  width: number;
};

/** The first message still visible at the top of `element`'s viewport. */
export function captureScrollAnchor(element: HTMLElement): ScrollAnchor | undefined {
  const items = element.querySelectorAll<HTMLElement>("[data-event-id]");
  if (!items.length) return undefined;
  const viewTop = element.getBoundingClientRect().top;
  // Messages stack in document order, so binary-search the first one whose bottom is below the top edge.
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid]!.getBoundingClientRect().bottom <= viewTop) lo = mid + 1;
    else hi = mid;
  }
  const item = items[lo]!;
  const id = item.dataset.eventId;
  if (!id) return undefined;
  const rect = item.getBoundingClientRect();
  return {
    id,
    ratio: rect.height > 0 ? (viewTop - rect.top) / rect.height : 0,
    width: element.clientWidth,
  };
}
