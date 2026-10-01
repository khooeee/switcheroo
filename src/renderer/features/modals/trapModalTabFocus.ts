/** Keep Tab cycling inside a modal root. No-op for other keys. */
export function trapModalTabFocus(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== "Tab") return;
  const items = [...root.querySelectorAll<HTMLElement>("button, input, select, textarea")].filter(
    (el) => !el.hasAttribute("disabled"),
  );
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && root.contains(active);
  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (!inside || active === last) {
    event.preventDefault();
    first.focus();
  }
}
