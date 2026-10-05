import { memo, type RefObject, useEffect } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SessionTurn } from "./SessionTurn";
import { useFocusTranscriptEvent } from "./useFocusTranscriptEvent";
import { useMessageSession } from "./useMessageSession";

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
  const messageSession = useMessageSession(session);

  useEffect(() => {
    if (focusTurnId) onForceOpenRightRail(focusTurnId, focusEventId ?? undefined);
  }, [focusTurnId, focusEventId, focusEventKey, onForceOpenRightRail]);

  // Wait for the right rail when focusing a turn so mid-turn events can be found.
  const focusReady = !focusTurnId || rightRailOpen;
  useFocusTranscriptEvent(focusEventId, focusEventKey, session.id, turns, focusReady);

  return (
    <>
      <div className="scroll" ref={chatRef} onContextMenu={onEditContextMenu}>
        <div className="transcript">
          {turns.length === 0 && session.status !== "running" && session.status !== "connecting" && (
            <div className="empty">Send a prompt to start this session.</div>
          )}
          {turns.map((turn) => (
            <SessionTurn
              key={turn.id}
              session={messageSession}
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
