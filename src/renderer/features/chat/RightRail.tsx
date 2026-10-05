import { memo, useEffect, useRef, type RefObject } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { flashEventElement } from "./flashEventElement";
import { ClosedTurnDetail } from "./ClosedTurnDetail";
import { TurnDetail } from "./TurnDetail";
import { useMessageSession } from "./useMessageSession";
import { startRightRailResize } from "./startRightRailResize";
import { useShowRightRail } from "./useShowRightRail";
import "./rightRail.css";

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
}) {
  const messageSession = useMessageSession(session);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const resolvedScrollRef = scrollRef ?? localScrollRef;

  useShowRightRail();

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

  return (
    <aside className="right-rail" aria-label="Turn Details">
      <div
        className="right-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right rail"
        onPointerDown={startRightRailResize}
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
        {messageSession ? (
          <TurnDetail session={messageSession} turn={turn} />
        ) : (
          <ClosedTurnDetail turn={turn} agent={agent} cwd={cwd} />
        )}
      </div>
    </aside>
  );
});
