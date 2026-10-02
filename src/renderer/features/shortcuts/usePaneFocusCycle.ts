import { useEffect, useRef, useState } from "react";
import {
  type FocusPane,
  requestFocusPane,
  subscribeFocusPane,
} from "./paneFocus";

function isModI(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "i";
}

/**
 * Cmd/Ctrl+I cycles prompt ↔ transcript.
 * Switchboard has no prompt, so Cmd+I focuses the transcript selection.
 * Turn details are reached with ArrowRight from the transcript (not Cmd+I).
 */
export function usePaneFocusCycle({
  hasPrompt,
  detailsOpen,
  blocked,
}: {
  hasPrompt: boolean;
  detailsOpen: boolean;
  blocked: boolean;
}): FocusPane {
  const [pane, setPane] = useState<FocusPane>(hasPrompt ? "prompt" : "transcript");
  const paneRef = useRef(pane);
  paneRef.current = pane;
  const hasPromptRef = useRef(hasPrompt);
  hasPromptRef.current = hasPrompt;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  useEffect(() => subscribeFocusPane(setPane), []);

  useEffect(() => {
    if (hasPrompt) return;
    if (paneRef.current === "prompt") {
      setPane("transcript");
      requestFocusPane("transcript");
    }
  }, [hasPrompt]);

  // Closing the rail while focused in details returns to the transcript.
  useEffect(() => {
    if (detailsOpen || paneRef.current !== "details") return;
    setPane("transcript");
    requestFocusPane("transcript");
  }, [detailsOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isModI(event) || event.repeat) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (blockedRef.current) return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector('[role="menu"]')) return;

      event.preventDefault();
      event.stopPropagation();

      if (!hasPromptRef.current) {
        setPane("transcript");
        requestFocusPane("transcript");
        return;
      }

      // From details (or anywhere else), step through prompt ↔ transcript only.
      const panes: FocusPane[] = ["prompt", "transcript"];
      const current = paneRef.current;
      const idx = panes.indexOf(current);
      const next = panes[(idx < 0 ? 0 : idx + 1) % panes.length] ?? "prompt";
      setPane(next);
      requestFocusPane(next);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return pane;
}
