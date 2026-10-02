import { memo, useCallback } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";

/** Full turn body for the right rail: user → events → assistant (no expand/collapse). */
export const TurnDetail = memo(function TurnDetail({
  session,
  turn,
  selectedEventId,
  onSelectEvent,
  onEventActivate,
}: {
  session: Session;
  turn: TranscriptTurn;
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
  onEventActivate?: (eventId: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const selectUser = useCallback(
    () => onSelectEvent?.(turn.user.id),
    [onSelectEvent, turn.user.id],
  );
  const selectAssistant = useCallback(() => {
    if (!turn.assistant) return;
    onSelectEvent?.(turn.assistant.id);
  }, [onSelectEvent, turn.assistant]);

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage
        session={session}
        item={turn.user}
        forkable
        selected={selectedEventId === turn.user.id}
        onSelect={onSelectEvent ? selectUser : undefined}
      />
      <TurnEvents
        session={session}
        events={turn.events}
        selectedEventId={selectedEventId}
        onSelect={onSelectEvent}
        onActivate={onEventActivate}
      />
      {running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          selected={selectedEventId === turn.assistant.id}
          onSelect={onSelectEvent ? selectAssistant : undefined}
        />
      ) : null}
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          extraFileChanges={turn.fileChanges}
          forkable
          selected={selectedEventId === turn.assistant.id}
          onSelect={onSelectEvent ? selectAssistant : undefined}
        />
      ) : null}
      {!running && !turn.assistant && turn.status === "stopped" ? (
        <div className="message stopped" data-event-id={`${turn.id}-stopped`}>
          <div className="body">Stopped</div>
        </div>
      ) : null}
    </div>
  );
});
