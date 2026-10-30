import { memo, useCallback, useMemo, useRef, type RefObject } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { SaveMarkdownButton } from "../copy/SaveMarkdownButton";
import { turnsMarkdown } from "../copy/turnsMarkdown";
import { SubagentRailHeading } from "../subagents/SubagentRailHeading";
import { ClosedTurnDetail } from "./ClosedTurnDetail";
import type { RightRailView } from "./RightRailView";
import { TurnDetail } from "./TurnDetail";
import { useMessageSession } from "./useMessageSession";
import { startRightRailResize } from "./startRightRailResize";
import { useFlashRightRailFocus } from "./useFlashRightRailFocus";
import { useRightRailScroll } from "./useRightRailScroll";
import { useShowRightRail } from "./useShowRightRail";
import "./rightRail.css";

const NO_TURNS: TranscriptTurn[] = [];

/** Scrollable right rail: one turn in full (Turn Details), or a subagent's whole transcript. */
export const RightRail = memo(function RightRail({
  tabId,
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
  /** Tab (Switchboard or a chat) this rail belongs to; it keeps its own width and scroll. */
  tabId: string;
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
  const agentKind = session?.agent ?? agent;
  const subagentTitle = subagent ? `Subagent · ${subagent.name}` : undefined;
  const userLabel = subagent ? "prompt" : undefined;
  const railMarkdown = useCallback(
    () => turnsMarkdown(turns, { agent: agentKind, title: subagentTitle, userLabel }),
    [turns, agentKind, subagentTitle, userLabel],
  );

  // Width first: restoring the scroll offset needs the tab's own width (and so its line wrapping).
  useShowRightRail(tabId);
  useRightRailScroll(tabId, focusEventId, focusKey, resolvedScrollRef);
  useFlashRightRailFocus(tabId, focusEventId, focusKey, firstTurnId, resolvedScrollRef);

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
        <div className="right-rail-header-actions">
          {turns.length ? (
            <SaveMarkdownButton
              text={railMarkdown}
              nameHint={subagentTitle ?? turns[0].user.text}
              label={subagent ? "Save Subagent as Markdown" : "Save Turn Details as Markdown"}
            />
          ) : null}
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
              userLabel={userLabel}
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
