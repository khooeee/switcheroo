// Search rendered text without inserting elements into React's DOM.
export function findTextRanges(root: HTMLElement, query: string): Range[] {
  if (!query) return [];
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, textarea, input, [hidden], [aria-hidden='true']")) continue;
    if (!parent.checkVisibility({ visibilityProperty: true })) continue;
    for (const match of (node.textContent ?? "").matchAll(pattern)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      if (range.getClientRects().length) ranges.push(range);
    }
  }
  return ranges;
}
