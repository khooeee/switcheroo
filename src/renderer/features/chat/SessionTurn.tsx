import { memo, useCallback, useMemo } from "react";
import type { Session, TranscriptTurn } from "../../../shared/types";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TranscriptMessage } from "./TranscriptMessage";
import { TurnEvents } from "./TurnEvents";

export const SessionTurn = memo(function SessionTurn({
  session,
  turn,
  expanded,
  onToggle,
}: {
  session: Session;
  turn: TranscriptTurn;
  expanded: boolean;
  onToggle: (turnId: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const handleToggle = useCallback(() => onToggle(turn.id), [onToggle, turn.id]);
  // Steers land as user events; keep them visible in zen/collapsed mode.
  const steerEvents = useMemo(
    () => turn.events.filter((event) => event.role === "user"),
    [turn.events],
  );

  return (
    <div className={`session-turn${expanded ? " expanded" : " collapsed"}`} data-turn-id={turn.id}>
      <TranscriptMessage session={session} item={turn.user} onActivate={handleToggle} />
      {expanded ? (
        <TurnEvents session={session} events={turn.events} />
      ) : (
        <TurnEvents session={session} events={steerEvents} />
      )}
      {running && expanded && turn.assistant ? (
        <TranscriptMessage session={session} item={turn.assistant} onActivate={handleToggle} />
      ) : null}
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          onActivate={handleToggle}
          extraFileChanges={turn.fileChanges}
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
