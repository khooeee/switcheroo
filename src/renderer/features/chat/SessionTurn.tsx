import { memo } from "react";
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
  onToggle: () => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;

  return (
    <div className={`session-turn${expanded ? " expanded" : " collapsed"}`} data-turn-id={turn.id}>
      <TranscriptMessage session={session} item={turn.user} onActivate={onToggle} />
      {expanded ? <TurnEvents session={session} events={turn.events} /> : null}
      {running && expanded && turn.assistant ? (
        <TranscriptMessage session={session} item={turn.assistant} onActivate={onToggle} />
      ) : null}
      {running ? <ThinkingIndicator /> : null}
      {!running && turn.assistant ? (
        <TranscriptMessage
          session={session}
          item={turn.assistant}
          onActivate={onToggle}
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
