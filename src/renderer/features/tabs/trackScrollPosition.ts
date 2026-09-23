interface ScrollPosition {
  top: number;
  pinned: boolean;
}

export function trackScrollPosition(element: HTMLElement, position: ScrollPosition): () => void {
  let appliedTop = element.scrollTop;

  const restore = () => {
    element.scrollTop = position.pinned ? element.scrollHeight : position.top;
    appliedTop = element.scrollTop;
  };
  const onScroll = () => {
    // Restoration also emits scroll events; keep the saved intent when content
    // is temporarily shorter (for example, while a transcript is loading).
    if (element.scrollTop === appliedTop) return;
    position.top = element.scrollTop;
    position.pinned = element.scrollHeight - element.clientHeight - element.scrollTop <= 4;
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
