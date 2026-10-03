import type { MouseEvent as ReactMouseEvent } from "react";

/** Right-click handler for transcript / turn-details: native edit context menu. */
export function onEditContextMenu(event: ReactMouseEvent | MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest("button, a, input, textarea, .context-menu, [role='menu']")) return;
  event.preventDefault();
  void window.switcheroo.showEditContextMenu();
}
