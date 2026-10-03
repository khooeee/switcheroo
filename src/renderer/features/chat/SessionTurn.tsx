import { memo, useCallback, useMemo } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";

/** Compact session turn: user + steers + assistant. Mid-turn events live in the right rail. */
export const SessionTurn = memo(function SessionTurn({
  session,
  turn,
  onOpenRightRail,
}: {
  session: Session;
  turn: TranscriptTurn;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const openRail = useCallback(
    (eventId: string) => onOpenRightRail(turn.id, eventId),
    [onOpenRightRail, turn.id],
  );
  const handleOpenUser = useCallback(() => openRail(turn.user.id), [openRail, turn.user.id]);
  const handleOpenAssistant = useCallback(() => {
    if (!turn.assistant) return;
    openRail(turn.assistant.id);
  }, [openRail, turn.assistant]);
  // Steers land as user events; keep them visible in the main feed.
  const steerEvents = useMemo(
    () => turn.events.filter((event) => event.role === "user"),
    [turn.events],
  );

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <TranscriptMessage
        session={session}
        item={turn.user}
        onActivate={handleOpenUser}
        forkable
      />
      <TurnEvents session={session} events={steerEvents} />
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          onActivate={handleOpenAssistant}
          extraFileChanges={turn.fileChanges}
          forkable
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
