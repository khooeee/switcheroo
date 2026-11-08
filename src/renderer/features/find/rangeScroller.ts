/** The find-searchable scroll container holding a range, if any. */
export function rangeScroller(range: Range): HTMLElement | null {
  const node = range.startContainer;
  const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as Element | null;
  return el?.closest(".scroll, .right-rail-scroll") as HTMLElement | null;
}
