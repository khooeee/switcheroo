import { useEffect, useRef } from "react";
import type { TranscriptItem } from "../../../shared/types";
import { ensureDetailsVisible } from "../settings/details";

/** Scroll to and flash a transcript event; reveals zen-hidden details first if needed. */
export function useFocusTranscriptEvent(
  focusEventId: string | null,
  focusEventKey: number,
  sessionId: string,
  items: TranscriptItem[],
): void {
  const appliedFocusKey = useRef<number | null>(null);

  useEffect(() => {
    if (!focusEventId) {
      appliedFocusKey.current = null;
      return;
    }
    const el = document.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    // Transcript may not be painted yet; retry when items arrive.
    if (!el) return;

    const wasHidden = getComputedStyle(el).display === "none";
    if (wasHidden) ensureDetailsVisible();

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

    if (wasHidden) {
      // Animations started in the same frame as display:none → visible are skipped; wait for paint.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(flash);
      });
    } else {
      flash();
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [focusEventId, focusEventKey, sessionId, items]);
}
