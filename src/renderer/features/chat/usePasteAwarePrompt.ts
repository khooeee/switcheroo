import { useEffect, useRef, type RefObject } from "react";
import { controlBootstrapText } from "../../../shared/controlBootstrapText";
import { dialogOpen } from "../shortcuts/dialogOpen";

/** Insert the control API bootstrap prompt at the composer cursor on `switcheroo:paste-aware-prompt` (Cmd+Shift+V / menu). */
export function usePasteAwarePrompt(
  sessionId: string,
  promptRef: RefObject<HTMLTextAreaElement | null>,
  onDraftChange: (text: string) => void,
): void {
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  useEffect(() => {
    const run = () => {
      const el = promptRef.current;
      if (!el || dialogOpen()) return;
      const text = controlBootstrapText(sessionId);
      const { value, selectionStart, selectionEnd } = el;
      const cursor = selectionStart + text.length;
      onDraftChangeRef.current(value.slice(0, selectionStart) + text + value.slice(selectionEnd));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    };
    window.addEventListener("switcheroo:paste-aware-prompt", run);
    return () => window.removeEventListener("switcheroo:paste-aware-prompt", run);
  }, [sessionId, promptRef]);
}
