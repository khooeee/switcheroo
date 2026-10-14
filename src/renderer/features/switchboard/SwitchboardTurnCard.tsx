import { memo, useCallback, useMemo } from "react";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { TurnDetailsButton } from "../copy/TurnDetailsButton";
import { ThinkingIndicator } from "../chat/ThinkingIndicator";
import { QueuedStatus } from "../chat/QueuedStatus";
import { TurnEvents } from "../chat/TurnEvents";
import { useMessageSession } from "../chat/useMessageSession";
import { useTurnRailOpeners } from "../chat/useTurnRailOpeners";

/** One Switchboard turn: user + steers + assistant. Mid-turn events live in the right rail. */
export const SwitchboardTurnCard = memo(function SwitchboardTurnCard({
  turn,
  title,
  session,
  onOpenRightRail,
  onOpen,
}: {
  turn: SwitchboardTurn;
  title: string;
  session: Session | undefined;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onOpen: (sessionId: string, turnId: string, eventId: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const messageSession = useMessageSession(session);
  const userText =
    turn.agent === "cursor" ? stripCursorStreamNoise(turn.user.text) : turn.user.text;
  const assistantText = turn.assistant
    ? turn.agent === "cursor"
      ? stripCursorStreamNoise(turn.assistant.text)
      : turn.assistant.text
    : "";
  const steerEvents = useMemo(
    () => turn.events.filter((event) => event.role === "user"),
    [turn.events],
  );
  const { openUser, openLatest, openAssistant } = useTurnRailOpeners(turn, onOpenRightRail);
  const handleOpenSession = useCallback(
    (eventId: string) => onOpen(turn.sessionId, turn.id, eventId),
    [onOpen, turn.sessionId, turn.id],
  );

  return (
    <div
      className={`session-turn switchboard-turn${turn.navigable ? " navigable" : ""}`}
      data-turn-id={turn.id}
      data-find-text={`${title} ${userText} ${assistantText}`}
    >
      <div
        className={`message user${turn.user.queued ? " queued" : ""}`}
        data-event-id={turn.user.id}
        data-copy-markdown={userText || undefined}
        data-turn-details=""
      >
        <div className="row">
          <span className="kind-pill">user</span>
          {turn.user.queued ? <QueuedStatus /> : null}
          <span
            className={`event-title${turn.navigable ? " openable" : ""}`}
            onClick={(e) => {
              if (!turn.navigable) return;
              e.stopPropagation();
              handleOpenSession(turn.user.id);
            }}
          >
            {title}
          </span>
          <span className="event-timestamp">
            {formatDetailTimestamp(turn.at)}
          </span>
        </div>
        <MarkdownBody text={userText} />
        <div className="event-actions">
          <CopyEventButton text={userText} />
          <TurnDetailsButton onToggle={openUser} />
        </div>
      </div>

      {messageSession && steerEvents.length > 0 ? (
        <TurnEvents
          session={messageSession}
          events={steerEvents}
          onActivate={turn.navigable ? handleOpenSession : undefined}
        />
      ) : null}
      {!messageSession && steerEvents.length > 0 ? (
        <div className="turn-events">
          {steerEvents.map((item) => (
            <div key={item.id} className={`message ${item.role}`} data-event-id={item.id}>
              <div className="body">{item.text}</div>
            </div>
          ))}
        </div>
      ) : null}

      {running ? <ThinkingIndicator onActivate={openLatest} /> : null}

      {!running && turn.assistant ? (
        <div
          className={`message assistant${turn.fileChanges.length ? " has-file-changes" : ""}`}
          data-event-id={turn.assistant.id}
          data-copy-markdown={assistantText || undefined}
          data-turn-details=""
        >
          <div className="row">
            <span className="kind-pill">assistant</span>
            <span className="event-timestamp">
              {formatDetailTimestamp(turn.assistant.at)}
            </span>
          </div>
          <MarkdownBody text={assistantText} />
          {turn.fileChanges.length ? (
            <FileChanges
              changes={turn.fileChanges}
              cwd={session?.cwd}
              sessionId={turn.sessionId}
              compact
            />
          ) : null}
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
            <TurnDetailsButton onToggle={openAssistant} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
