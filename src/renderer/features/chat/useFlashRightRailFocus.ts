import { useEffect, type RefObject } from "react";
import { flashEventElement } from "./flashEventElement";

/** Focus key each tab's rail last flashed; this app run only. */
const flashed = new Map<string, number>();

/** Flash (and scroll to the top of) the focus event once per selection, not again when switching back to its tab. */
export function useFlashRightRailFocus(
  tabId: string,
  focusEventId: string | undefined,
  focusKey: number,
  /** Retry once turns arrive (a subagent transcript may still be loading). */
  firstTurnId: string | undefined,
  scrollRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!focusEventId || flashed.get(tabId) === focusKey) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    // Mark on the next frame: StrictMode cancels this run and mounts again, which must still flash.
    const mark = requestAnimationFrame(() => flashed.set(tabId, focusKey));
    const stop = flashEventElement(el, "start");
    return () => {
      cancelAnimationFrame(mark);
      stop();
    };
  }, [tabId, focusEventId, focusKey, firstTurnId, scrollRef]);
}
