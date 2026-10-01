import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "../../../shared/types";

/** Scroll to and flash a transcript event after its turn is expanded. */
export function useFocusTranscriptEvent(
  focusEventId: string | null,
  focusEventKey: number,
  sessionId: string,
  turns: TranscriptTurn[],
  turnExpanded = true,
): void {
  const appliedFocusKey = useRef<number | null>(null);

  useEffect(() => {
    if (!focusEventId) {
      appliedFocusKey.current = null;
      return;
    }
    if (!turnExpanded) return;
    const el = document.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    // Transcript may not be painted yet; retry when turns arrive / expand.
    if (!el) return;

    const sameFocus = appliedFocusKey.current === focusEventKey;
    appliedFocusKey.current = focusEventKey;

    let raf1 = 0;
    let raf2 = 0;
    let t = 0;
    const flash = () => {
      if (!sameFocus) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!sameFocus || !el.classList.contains("highlight")) {
        el.classList.remove("highlight");
        void el.offsetWidth;
        el.classList.add("highlight");
      }
      t = window.setTimeout(() => el.classList.remove("highlight"), 1200);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(flash);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [focusEventId, focusEventKey, sessionId, turns, turnExpanded]);
}
