import { useEffect, useRef } from "react";
import { dialogOpen } from "./dialogOpen";
import { modKey } from "./modKey";
import { requestPromptFocus } from "./paneFocus";

/** Cmd+I focuses the prompt when a session chat is open. */
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
      if (!modKey(event, "i") || event.repeat) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (blockedRef.current) return;
      if (!hasPromptRef.current) return;
      if (dialogOpen()) return;
      if (document.querySelector('[role="menu"]')) return;

      event.preventDefault();
      event.stopPropagation();
      requestPromptFocus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
