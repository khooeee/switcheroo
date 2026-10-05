import type { ScrollPosition } from "./trackScrollPosition";

export function pinScrollToBottom(element: HTMLElement, position: ScrollPosition): void {
  position.pinned = true;
  element.scrollTop = element.scrollHeight;
  position.top = element.scrollTop;
}
