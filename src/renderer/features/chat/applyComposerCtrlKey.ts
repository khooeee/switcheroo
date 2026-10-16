import type { KeyboardEvent } from "react";
import { ctrlOnlyKey } from "../shortcuts/ctrlOnlyKey";
import { deleteWordBefore } from "./deleteWordBefore";

/** Terminal-style editing: Ctrl+A prompt start, Ctrl+E prompt end, Ctrl+W delete word. Returns true when handled. */
export function applyComposerCtrlKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  draft: string,
  onDraftChange: (text: string) => void,
): boolean {
  const textarea = event.currentTarget;
  if (ctrlOnlyKey(event, "a")) {
    textarea.setSelectionRange(0, 0);
    textarea.scrollTop = 0;
    return true;
  }
  if (ctrlOnlyKey(event, "e")) {
    textarea.setSelectionRange(draft.length, draft.length);
    textarea.scrollTop = textarea.scrollHeight;
    return true;
  }
  if (ctrlOnlyKey(event, "w")) {
    const next = deleteWordBefore(draft, textarea.selectionStart, textarea.selectionEnd);
    if (next.value === draft) return true;
    onDraftChange(next.value);
    requestAnimationFrame(() => textarea.setSelectionRange(next.cursor, next.cursor));
    return true;
  }
  return false;
}
