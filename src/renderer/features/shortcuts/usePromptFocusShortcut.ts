import { useEffect, useRef } from "react";
import { requestPromptFocus } from "./paneFocus";

function isModI(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "i";
}

/** Cmd/Ctrl+I focuses the prompt when a session chat is open. */
export function usePromptFocusShortcut({
  hasPrompt,
  blocked,
}: {
  hasPrompt: boolean;
  blocked: boolean;
}): void {
  const hasPromptRef = useRef(hasPrompt);
  hasPromptRef.current = hasPrompt;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isModI(event) || event.repeat) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (blockedRef.current) return;
      if (!hasPromptRef.current) return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector('[role="menu"]')) return;

      event.preventDefault();
      event.stopPropagation();
      requestPromptFocus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
