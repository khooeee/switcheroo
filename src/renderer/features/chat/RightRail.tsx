import { memo, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { flashEventElement } from "./flashEventElement";
import { ClosedTurnDetail } from "./ClosedTurnDetail";
import { TurnDetail } from "./TurnDetail";
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
  onClose: () => void;
  onEventActivate?: (eventId: string) => void;
}) {
  const localScrollRef = useRef<HTMLDivElement>(null);
  const resolvedScrollRef = scrollRef ?? localScrollRef;

  useEffect(() => {
    showRightRail();
    return () => hideRightRail();
  }, []);

  useEffect(() => {
    if (!focusEventId) return;
    const root = resolvedScrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(focusEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    return flashEventElement(el);
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
      <div className="right-rail-scroll" ref={resolvedScrollRef} onContextMenu={onEditContextMenu}>
        {session ? (
          <TurnDetail
            session={session}
            turn={turn}
            onEventActivate={onEventActivate}
          />
        ) : (
          <ClosedTurnDetail turn={turn} agent={agent} cwd={cwd} />
        )}
      </div>
    </aside>
  );
});
