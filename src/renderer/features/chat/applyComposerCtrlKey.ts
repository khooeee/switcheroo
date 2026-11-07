import type { KeyboardEvent } from "react";
import { ctrlOnlyKey } from "../shortcuts/ctrlOnlyKey";

/** Terminal-style editing: Ctrl+A prompt start. Returns true when handled. */
export function applyComposerCtrlKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  if (!ctrlOnlyKey(event, "a")) return false;
  const textarea = event.currentTarget;
  textarea.setSelectionRange(0, 0);
  textarea.scrollTop = 0;
  return true;
}
