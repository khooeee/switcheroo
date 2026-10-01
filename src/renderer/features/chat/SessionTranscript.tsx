import { memo, type RefObject, useEffect } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { SessionTurn } from "./SessionTurn";
import { useTurnExpansion } from "./useTurnExpansion";
import { useFocusTranscriptEvent } from "./useFocusTranscriptEvent";

export const SessionTranscript = memo(function SessionTranscript({
  session,
  turns,
  focusEventId,
  focusTurnId,
  focusEventKey,
  chatRef,
}: {
  session: Session;
  turns: TranscriptTurn[];
  focusEventId: string | null;
  focusTurnId: string | null;
  focusEventKey: number;
  chatRef: RefObject<HTMLDivElement | null>;
}) {
  const { isExpanded, toggle, forceExpand } = useTurnExpansion();

  useEffect(() => {
    if (focusTurnId) forceExpand(focusTurnId);
  }, [focusTurnId, focusEventKey, forceExpand]);

  const focusExpanded = focusTurnId ? isExpanded(focusTurnId) : true;
  useFocusTranscriptEvent(focusEventId, focusEventKey, session.id, turns, focusExpanded);

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
              expanded={isExpanded(turn.id)}
              onToggle={() => toggle(turn.id)}
            />
          ))}
          {session.status === "connecting" && <ThinkingIndicator label="Creating session" />}
        </div>
      </div>
      <div className="scroll-fade" aria-hidden="true" />
    </>
  );
});
