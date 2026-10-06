import type { MouseEvent as ReactMouseEvent } from "react";
import { setPendingFindScope } from "../find/pendingFindScope";
import { codeBlockText } from "../markdown/codeBlockText";

/** Right-click handler for transcript / turn-details: native edit context menu. */
export function onEditContextMenu(event: ReactMouseEvent | MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest("button, a, input, textarea, .context-menu, [role='menu']")) return;
  event.preventDefault();
  const selection = window.getSelection();
  const canCopy = !!selection && !selection.isCollapsed && !!selection.toString();
  const codeBlock = target?.closest(".markdown-code-block") ?? null;
  const code = codeBlock ? codeBlockText(codeBlock) || undefined : undefined;
  const markdown =
    target?.closest("[data-copy-markdown]")?.getAttribute("data-copy-markdown") || undefined;
  const message = target?.closest(".message") as HTMLElement | null;
  setPendingFindScope(message);
  const detailsMsg = target?.closest(".message[data-turn-details]") as HTMLElement | null;
  const turnId = detailsMsg?.closest("[data-turn-id]")?.getAttribute("data-turn-id") || undefined;
  const detailsEventId = detailsMsg?.getAttribute("data-event-id") || undefined;
  void window.switcheroo.showEditContextMenu({
    code,
    markdown,
    canCopy,
    canFind: !!message,
    turnDetails: turnId && detailsEventId ? { turnId, eventId: detailsEventId } : undefined,
  });
}
