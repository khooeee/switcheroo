import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { SubagentRailHeading } from "../subagents/SubagentRailHeading";
import { flashEventElement } from "./flashEventElement";
import { ClosedTurnDetail } from "./ClosedTurnDetail";
import type { RightRailView } from "./RightRailView";
import { TurnDetail } from "./TurnDetail";
import { useMessageSession } from "./useMessageSession";
import { startRightRailResize } from "./startRightRailResize";
import { useShowRightRail } from "./useShowRightRail";
import "./rightRail.css";

const NO_TURNS: TranscriptTurn[] = [];

/** Scrollable right rail: one turn in full (Turn Details), or a subagent's whole transcript. */
export const RightRail = memo(function RightRail({
  session,
  turn,
  subagent,
  agent,
  cwd,
  scrollRef,
  focusEventId,
  focusKey = 0,
  onClose,
}: {
  session: Session | undefined;
  turn: TranscriptTurn | null;
  subagent: RightRailView["subagent"];
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
  const turns = useMemo(
    () => subagent?.turns ?? (turn ? [turn] : NO_TURNS),
    [subagent?.turns, turn],
  );
  const firstTurnId = turns[0]?.id;
  const label = subagent ? "Subagent" : "Turn Details";

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
  }, [focusEventId, focusKey, firstTurnId, resolvedScrollRef]);

  return (
    <aside className="right-rail" aria-label={label}>
      <div
        className="right-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right rail"
        onPointerDown={startRightRailResize}
      />
      <div className="right-rail-header">
        {subagent ? <SubagentRailHeading subagent={subagent} /> : <h2>Turn Details</h2>}
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
        {subagent && turns.length === 0 ? (
          <div className="subagent-rail-empty">
            {subagent.loading ? "Loading…" : "No transcript was saved for this subagent."}
          </div>
        ) : null}
        {turns.map((entry) =>
          messageSession ? (
            <TurnDetail
              key={entry.id}
              session={messageSession}
              turn={entry}
              userLabel={subagent ? "prompt" : undefined}
              forkable={!subagent}
            />
          ) : (
            <ClosedTurnDetail key={entry.id} turn={entry} agent={agent} cwd={cwd} />
          ),
        )}
      </div>
    </aside>
  );
});
