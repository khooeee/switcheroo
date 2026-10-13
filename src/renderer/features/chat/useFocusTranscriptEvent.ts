import { type RefObject, useEffect, useRef } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { flashEventElement } from "./flashEventElement";

/** Scroll to and flash a main transcript event once per focus key. */
export function useFocusTranscriptEvent(
  focusEventId: string | null,
  focusEventKey: number,
  scrollRef: RefObject<HTMLElement | null>,
  turns: TranscriptTurn[],
): void {
  const flashedKey = useRef<number | null>(null);

  useEffect(() => {
    if (!focusEventId || flashedKey.current === focusEventKey) return;
    const el = scrollRef.current?.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    // Transcript may not be painted yet; retry when turns arrive.
    if (!el) return;

    // Mark on the next frame: StrictMode cancels this run and mounts again, which must still flash.
    let marked = false;
    const mark = requestAnimationFrame(() => {
      marked = true;
      flashedKey.current = focusEventKey;
    });
    const stop = flashEventElement(el);
    // Once marked, later turn updates leave the running flash alone.
    return () => {
      cancelAnimationFrame(mark);
      if (!marked) stop();
    };
  }, [focusEventId, focusEventKey, scrollRef, turns]);
}
