import { memo, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { requestFocusPane } from "../shortcuts/paneFocus";
import { ClosedTurnDetail } from "./ClosedTurnDetail";
import { TurnDetail } from "./TurnDetail";
import { useTurnDetailNav } from "./useTurnDetailNav";
import {
  applyRightRailWidth,
  hideRightRail,
  readRightRailWidth,
  showRightRail,
} from "./rightRailWidth";

/** Scrollable right rail showing one turn in full (user + events + assistant). */
export const RightRail = memo(function RightRail({
  session,
  turn,
  agent,
  cwd,
  scrollRef,
  focusEventId,
  focusKey = 0,
  takeFocus = false,
  onClose,
  onEventActivate,
}: {
  session: Session | undefined;
  turn: TranscriptTurn;
  /** When session is missing (closed Switchboard turn). */
  agent?: string;
  cwd?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  focusEventId?: string;
  focusKey?: number;
  /** Opened via ArrowRight — take keyboard focus into details. */
  takeFocus?: boolean;
  onClose: () => void;
  onEventActivate?: (eventId: string) => void;
}) {
  const localScrollRef = useRef<HTMLDivElement>(null);
  const resolvedScrollRef = scrollRef ?? localScrollRef;
  const { selectedEventId, selectEvent } = useTurnDetailNav(
    turn,
    resolvedScrollRef,
    focusEventId,
    onEventActivate,
  );

  useEffect(() => {
    showRightRail();
    return () => hideRightRail();
  }, []);

  useEffect(() => {
    if (!takeFocus) return;
    requestFocusPane("details");
  }, [takeFocus, focusKey, turn.id]);

  useEffect(() => {
    if (!focusEventId) return;
    const root = resolvedScrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let t = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Same flash as find-in-history / navigate-to-event.
        el.classList.remove("highlight");
        void el.offsetWidth;
        el.classList.add("highlight");
        t = window.setTimeout(() => el.classList.remove("highlight"), 1200);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
      el.classList.remove("highlight");
    };
  }, [focusEventId, focusKey, turn.id, resolvedScrollRef]);

  const resize = (event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = readRightRailWidth();
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      // Dragging the left edge: move left → wider.
      applyRightRailWidth(startWidth + (startX - ev.clientX));
    };
    const stop = (ev: PointerEvent) => {
      applyRightRailWidth(startWidth + (startX - ev.clientX), true);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <aside className="right-rail" aria-label="Turn Details">
      <div
        className="right-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right rail"
        onPointerDown={resize}
      />
      <div className="right-rail-header">
        <h2>Turn Details</h2>
        <button
          type="button"
          className="btn"
          aria-label="Close right rail"
          data-tooltip="Close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="right-rail-scroll" ref={resolvedScrollRef}>
        {session ? (
          <TurnDetail
            session={session}
            turn={turn}
            selectedEventId={selectedEventId}
            onSelectEvent={selectEvent}
            onEventActivate={onEventActivate}
          />
        ) : (
          <ClosedTurnDetail
            turn={turn}
            agent={agent}
            cwd={cwd}
            selectedEventId={selectedEventId}
          />
        )}
      </div>
    </aside>
  );
});
