/** Select-and-flash an event element (find / navigate-to-event). */
export function flashEventElement(el: HTMLElement, scroll = true): () => void {
  let raf1 = 0;
  let raf2 = 0;
  let t = 0;
  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      if (scroll) el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("highlight");
      void el.offsetWidth;
      el.classList.add("highlight");
      t = window.setTimeout(() => el.classList.remove("highlight"), 1200);
    });
  });
  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    clearTimeout(t);
    el.classList.remove("highlight");
  };
}
