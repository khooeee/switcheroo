import { useCallback, useState } from "react";
import type { ActiveSessionId } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { useFocusShortcut } from "../shortcuts/useFocusShortcut";

/** Prompt/rail/notes focus shortcuts; returns a nonce ChatPanel watches for Cmd+I. */
export function useSessionFocusShortcuts(activeSessionId: ActiveSessionId, blocked: boolean): number {
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionUi = activeSessionId !== SWITCHBOARD_ID && !blocked;

  const focusPrompt = useCallback(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    setPromptFocus((n) => n + 1);
  }, [activeSessionId]);

  const focusRail = useCallback(() => {
    const el = document.querySelector<HTMLElement>(
      `.rail [data-rail-id="${CSS.escape(activeSessionId)}"]`,
    );
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [activeSessionId]);

  const focusNotes = useCallback(() => {
    document.querySelector<HTMLTextAreaElement>(".session-notes textarea")?.focus();
  }, []);

  useFocusShortcut({
    enabled: sessionUi,
    key: "i",
    eventName: "switcheroo:focus-prompt",
    onFocus: focusPrompt,
  });
  useFocusShortcut({
    enabled: !blocked,
    key: "e",
    shift: true,
    eventName: "switcheroo:focus-rail",
    onFocus: focusRail,
  });
  useFocusShortcut({
    enabled: sessionUi,
    key: "n",
    shift: true,
    eventName: "switcheroo:focus-notes",
    onFocus: focusNotes,
  });

  return promptFocus;
}
