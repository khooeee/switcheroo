import { useEffect, useState } from "react";
import type { ActiveSessionId } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

/** Prompt focus via `switcheroo:focus-prompt` (Cmd+I pane cycle → prompt). */
export function useSessionFocusShortcuts(activeSessionId: ActiveSessionId, blocked: boolean): number {
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionUi = activeSessionId !== SWITCHBOARD_ID && !blocked;

  useEffect(() => {
    const run = () => {
      if (!sessionUi) return;
      setPromptFocus((n) => n + 1);
    };
    window.addEventListener("switcheroo:focus-prompt", run);
    return () => window.removeEventListener("switcheroo:focus-prompt", run);
  }, [sessionUi]);

  return promptFocus;
}
