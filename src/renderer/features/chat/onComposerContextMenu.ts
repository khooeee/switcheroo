import type { MouseEvent as ReactMouseEvent } from "react";

/** Right-click handler for the composer textarea. */
export function onComposerContextMenu(event: ReactMouseEvent | MouseEvent): void {
  event.preventDefault();
  const el = event.currentTarget as HTMLTextAreaElement | null;
  const hasSelection = !!el && el.selectionStart !== el.selectionEnd;
  void window.switcheroo.showComposerContextMenu({
    canCut: hasSelection,
    canCopy: hasSelection,
    canSelectAll: !!el?.value,
  });
}
