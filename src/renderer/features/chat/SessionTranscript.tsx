import { memo, type RefObject, useCallback, useEffect, useMemo } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SessionTurn } from "./SessionTurn";
import { railArgsForFeedEvent } from "./railArgsForFeedEvent";
import { selectableFeedEventIds } from "./selectableFeedEventIds";
import { useFeedMessageNav } from "./useFeedMessageNav";
import { useFocusTranscriptEvent } from "./useFocusTranscriptEvent";

export const SessionTranscript = memo(function SessionTranscript({
  session,
  turns,
  focusEventId,
  focusTurnId,
  focusEventKey,
  chatRef,
  onOpenRightRail,
  onForceOpenRightRail,
  rightRailOpen,
}: {
  session: Session;
  turns: TranscriptTurn[];
  focusEventId: string | null;
  focusTurnId: string | null;
  focusEventKey: number;
  chatRef: RefObject<HTMLDivElement | null>;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onForceOpenRightRail: (turnId: string, focusEventId?: string) => void;
  rightRailOpen: boolean;
}) {
  const eventIds = useMemo(() => selectableFeedEventIds(turns), [turns]);
  const activateSelected = useCallback(
    (eventId: string) => {
      const args = railArgsForFeedEvent(turns, eventId);
      if (!args) return;
      onOpenRightRail(args.turnId, args.focusEventId);
    },
    [turns, onOpenRightRail],
  );
  const { selectedEventId, selectMessage } = useFeedMessageNav(
    eventIds,
    chatRef,
    session.id,
    activateSelected,
    undefined,
    true,
  );

  useEffect(() => {
    if (focusTurnId) onForceOpenRightRail(focusTurnId, focusEventId ?? undefined);
  }, [focusTurnId, focusEventId, focusEventKey, onForceOpenRightRail]);

  // Wait for the right rail when focusing a turn so mid-turn events can be found.
  const focusReady = !focusTurnId || rightRailOpen;
  useFocusTranscriptEvent(focusEventId, focusEventKey, session.id, turns, focusReady);

  return (
    <>
      <div className="scroll" ref={chatRef}>
        <div className="transcript">
          {turns.length === 0 && session.status !== "running" && session.status !== "connecting" && (
            <div className="empty">Send a prompt to start this session.</div>
          )}
          {turns.map((turn) => (
            <SessionTurn
              key={turn.id}
              session={session}
              turn={turn}
              selectedEventId={selectedEventId}
              onSelectMessage={selectMessage}
              onOpenRightRail={onOpenRightRail}
            />
          ))}
          {session.status === "connecting" && <ThinkingIndicator label="Creating session" />}
        </div>
      </div>
      <div className="scroll-fade" aria-hidden="true" />
    </>
  );
});
