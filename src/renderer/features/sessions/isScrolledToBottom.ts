/** Whether `element` is scrolled to (within a few pixels of) its bottom edge. */
export function isScrolledToBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.clientHeight - element.scrollTop <= 4;
}
