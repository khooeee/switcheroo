import type { MouseEvent as ReactMouseEvent } from "react";
import { setPendingFindScope } from "../find/pendingFindScope";

/** Right-click handler for transcript / turn-details: native edit context menu. */
export function onEditContextMenu(event: ReactMouseEvent | MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest("button, a, input, textarea, .context-menu, [role='menu']")) return;
  event.preventDefault();
  const selection = window.getSelection();
  const canCopy = !!selection && !selection.isCollapsed && !!selection.toString();
  const markdown =
    target?.closest("[data-copy-markdown]")?.getAttribute("data-copy-markdown") || undefined;
  const message = target?.closest(".message") as HTMLElement | null;
  setPendingFindScope(message);
  const forkRoot = target?.closest("[data-fork-session][data-fork-event]") as HTMLElement | null;
  const sessionId = forkRoot?.getAttribute("data-fork-session") || undefined;
  const eventId = forkRoot?.getAttribute("data-fork-event") || undefined;
  void window.switcheroo.showEditContextMenu({
    markdown,
    canCopy,
    canFind: !!message,
    fork: sessionId && eventId ? { sessionId, eventId } : undefined,
  });
}
