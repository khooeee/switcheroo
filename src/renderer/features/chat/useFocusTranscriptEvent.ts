import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "../../../shared/types";
import { flashEventElement } from "./flashEventElement";

/** Scroll to and flash a transcript event (prefers the right rail when open). */
export function useFocusTranscriptEvent(
  focusEventId: string | null,
  focusEventKey: number,
  sessionId: string,
  turns: TranscriptTurn[],
  ready = true,
): void {
  const appliedFocusKey = useRef<number | null>(null);

  useEffect(() => {
    if (!focusEventId) {
      appliedFocusKey.current = null;
      return;
    }
    if (!ready) return;

    const rail = document.querySelector(".right-rail") as HTMLElement | null;
    const scope: ParentNode = rail ?? document;
    const el = scope.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    // Transcript / rail may not be painted yet; retry when turns arrive.
    if (!el) return;

    const sameFocus = appliedFocusKey.current === focusEventKey;
    appliedFocusKey.current = focusEventKey;
    if (sameFocus && el.classList.contains("highlight")) return;

    return flashEventElement(el, !sameFocus);
  }, [focusEventId, focusEventKey, sessionId, turns, ready]);
}
