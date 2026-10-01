import { useCallback, useState } from "react";
import type { ActiveSessionId } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { useFocusShortcut } from "../shortcuts/useFocusShortcut";

/** Prompt focus shortcut; returns a nonce ChatPanel watches for Cmd+I. */
export function useSessionFocusShortcuts(activeSessionId: ActiveSessionId, blocked: boolean): number {
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionUi = activeSessionId !== SWITCHBOARD_ID && !blocked;

  const focusPrompt = useCallback(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    setPromptFocus((n) => n + 1);
  }, [activeSessionId]);

  useFocusShortcut({
    enabled: sessionUi,
    key: "i",
    eventName: "switcheroo:focus-prompt",
    onFocus: focusPrompt,
  });

  return promptFocus;
}
