import { memo, type RefObject, useEffect } from "react";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { onEditContextMenu } from "../copy/onEditContextMenu";
import { isFeedEvent } from "./isFeedEvent";
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
}: {
  session: Session;
  turns: TranscriptTurn[];
  focusEventId: string | null;
  focusTurnId: string | null;
  focusEventKey: number;
  chatRef: RefObject<HTMLDivElement | null>;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onForceOpenRightRail: (turnId: string, focusEventId?: string) => void;
}) {
  const messageSession = useMessageSession(session);

  // User messages and final replies flash in the transcript; mid-turn events open Turn Details.
  const focusTurn = focusTurnId ? turns.find((turn) => turn.id === focusTurnId) : undefined;
  const focusInFeed = !!focusTurn && !!focusEventId && isFeedEvent(focusTurn, focusEventId);

  useEffect(() => {
    if (focusTurnId && !focusInFeed) onForceOpenRightRail(focusTurnId, focusEventId ?? undefined);
  }, [focusTurnId, focusEventId, focusEventKey, focusInFeed, onForceOpenRightRail]);

  useFocusTranscriptEvent(focusInFeed ? focusEventId : null, focusEventKey, chatRef, turns);

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
