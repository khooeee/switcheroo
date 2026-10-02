import { memo, type RefObject, useEffect } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SessionTurn } from "./SessionTurn";
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
  onOpenRightRail: (turnId: string) => void;
  onForceOpenRightRail: (turnId: string) => void;
  rightRailOpen: boolean;
}) {
  useEffect(() => {
    if (focusTurnId) onForceOpenRightRail(focusTurnId);
  }, [focusTurnId, focusEventKey, onForceOpenRightRail]);

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
