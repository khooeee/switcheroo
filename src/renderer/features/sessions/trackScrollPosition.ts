import { captureScrollAnchor, type ScrollAnchor } from "./captureScrollAnchor";
import { restoreScrollAnchor } from "./restoreScrollAnchor";

/** Saved scroll intent for one transcript: offset, or stuck to the bottom. */
export interface ScrollPosition {
  top: number;
  pinned: boolean;
  /** Message at the top of the viewport when scrolled up; used once the width (and so wrapping) changes. */
  anchor?: ScrollAnchor;
}

export function trackScrollPosition(element: HTMLElement, position: ScrollPosition): () => void {
  let appliedTop = element.scrollTop;

  const restore = () => {
    const anchor = position.anchor;
    if (position.pinned) {
      element.scrollTop = element.scrollHeight;
    } else if (anchor && anchor.width !== element.clientWidth && restoreScrollAnchor(element, anchor)) {
      // A new width (e.g. the right rail opening) re-wraps every message, so the same pixel
      // offset would land somewhere else. Keep the same message at the top instead.
      position.top = element.scrollTop;
      position.anchor = captureScrollAnchor(element);
    } else {
      element.scrollTop = position.top;
    }
    appliedTop = element.scrollTop;
  };
  const onScroll = () => {
    // Restoration also emits scroll events; keep the saved intent when content
    // is temporarily shorter (for example, while a transcript is loading).
    if (element.scrollTop === appliedTop) return;
    position.top = element.scrollTop;
    position.pinned = element.scrollHeight - element.clientHeight - element.scrollTop <= 4;
    position.anchor = position.pinned ? undefined : captureScrollAnchor(element);
    appliedTop = element.scrollTop;
  };

  const resize = new ResizeObserver(restore);
  const observeSizes = () => {
    resize.disconnect();
    resize.observe(element);
    for (const child of element.children) resize.observe(child);
  };
  const mutations = new MutationObserver(() => {
    observeSizes();
    restore();
  });

  restore();
  observeSizes();
  mutations.observe(element, { childList: true, subtree: true, characterData: true });
  element.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    element.removeEventListener("scroll", onScroll);
    resize.disconnect();
    mutations.disconnect();
  };
}
