import { useEffect, useRef, type RefObject } from "react";
import { dialogOpen } from "../shortcuts/dialogOpen";

/** Insert prompt text at the composer cursor when a menu fires `eventName`. */
export function usePastePrompt(
  eventName: string,
  textFor: (event: Event) => string,
  promptRef: RefObject<HTMLTextAreaElement | null>,
  onDraftChange: (text: string) => void,
): void {
  const textForRef = useRef(textFor);
  textForRef.current = textFor;
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  useEffect(() => {
    const run = (event: Event) => {
      const el = promptRef.current;
      if (!el || dialogOpen()) return;
      const text = textForRef.current(event);
      const { value, selectionStart, selectionEnd } = el;
      const cursor = selectionStart + text.length;
      onDraftChangeRef.current(value.slice(0, selectionStart) + text + value.slice(selectionEnd));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    };
    window.addEventListener(eventName, run);
    return () => window.removeEventListener(eventName, run);
  }, [eventName, promptRef]);
}
