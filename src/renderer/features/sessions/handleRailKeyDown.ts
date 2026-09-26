import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ActiveSessionId } from "../../../shared/types";

/** Arrow/Space/Enter navigation while a rail tab button is focused. */
export function handleRailKeyDown(
  event: ReactKeyboardEvent,
  rail: HTMLElement,
  onSelect: (id: ActiveSessionId) => void,
): void {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-rail-id]");
  if (!target || !rail.contains(target)) return;

  const order = [...rail.querySelectorAll<HTMLElement>("[data-rail-id]")];
  const index = order.indexOf(target);
  if (index < 0) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = order[(index + step + order.length) % order.length];
    next.focus();
    next.scrollIntoView({ block: "nearest" });
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    onSelect(target.dataset.railId as ActiveSessionId);
  }
}
