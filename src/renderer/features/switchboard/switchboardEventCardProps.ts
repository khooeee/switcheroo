import type { KeyboardEvent, MouseEvent } from "react";
import type { SwitchboardEvent } from "../../../shared/types";

/** Props that make a Switchboard feed card open its session on click/keyboard. */
export function switchboardEventCardProps(
  event: SwitchboardEvent,
  title: string,
  onOpen: (event: SwitchboardEvent) => void,
) {
  const open = () => onOpen(event);

  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Open ${title} at this event`,
    onClick: (e: MouseEvent<HTMLElement>) => {
      const target = e.target as { closest?: (selector: string) => unknown } | null;
      if (target?.closest?.("a, button")) return;
      open();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      open();
    },
  };
}
