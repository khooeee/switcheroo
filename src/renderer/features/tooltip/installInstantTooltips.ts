/** Show [data-tooltip] tips immediately on hover (native title always delays). */
export function installInstantTooltips(): void {
  const tip = document.createElement("div");
  tip.className = "instant-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);

  let active: Element | null = null;

  const hide = () => {
    active = null;
    tip.hidden = true;
    tip.textContent = "";
  };

  const place = (el: Element) => {
    const text = el.getAttribute("data-tooltip");
    if (!text) {
      hide();
      return;
    }
    active = el;
    tip.textContent = text;
    tip.hidden = false;
    const rect = el.getBoundingClientRect();
    tip.style.left = "0px";
    tip.style.top = "0px";
    tip.style.transform = "none";
    const size = tip.getBoundingClientRect();
    const side = el.getAttribute("data-tooltip-side");
    if (side === "right") {
      let left = rect.right + 8;
      left = Math.min(left, window.innerWidth - size.width - 8);
      let top = rect.top + (rect.height - size.height) / 2;
      top = Math.max(8, Math.min(top, window.innerHeight - size.height - 8));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      return;
    }
    const align = el.getAttribute("data-tooltip-align");
    let left = rect.left;
    if (align === "end") left = rect.right - size.width;
    else if (align === "center") left = rect.left + (rect.width - size.width) / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - size.width - 8));
    let top = rect.top - size.height - 6;
    if (top < 8) top = rect.bottom + 6;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  document.addEventListener("pointerover", (event) => {
    const el = (event.target as Element | null)?.closest?.("[data-tooltip]");
    if (!el) {
      if (active) hide();
      return;
    }
    if (el !== active) place(el);
  });

  document.addEventListener("focusin", (event) => {
    const el = (event.target as Element | null)?.closest?.("[data-tooltip]");
    if (el) place(el);
  });

  document.addEventListener("focusout", (event) => {
    if (!active) return;
    const next = event.relatedTarget as Element | null;
    if (next?.closest?.("[data-tooltip]") === active) return;
    hide();
  });

  document.addEventListener("scroll", hide, true);
  window.addEventListener("blur", hide);
}
