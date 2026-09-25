import { useCallback, useState } from "react";
import type { ActiveTabId } from "../../../shared/types";
import { MASTER_TAB_ID } from "../../../shared/types";
import { useFocusShortcut } from "../shortcuts/useFocusShortcut";

/** Prompt/rail/notes focus shortcuts; returns a nonce ChatPanel watches for Cmd+I. */
export function useSessionFocusShortcuts(activeTabId: ActiveTabId, blocked: boolean): number {
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionUi = activeTabId !== MASTER_TAB_ID && !blocked;

  const focusPrompt = useCallback(() => {
    if (activeTabId === MASTER_TAB_ID) return;
    setPromptFocus((n) => n + 1);
  }, [activeTabId]);

  const focusRail = useCallback(() => {
    const el = document.querySelector<HTMLElement>(
      `.rail [data-rail-id="${CSS.escape(activeTabId)}"]`,
    );
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [activeTabId]);

  const focusNotes = useCallback(() => {
    document.querySelector<HTMLTextAreaElement>(".tab-notes textarea")?.focus();
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
