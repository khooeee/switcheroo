import { memo, useCallback, useMemo } from "react";
import type { Session, SwitchboardTurn } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { TurnDetailsButton } from "../copy/TurnDetailsButton";
import { ThinkingIndicator } from "../chat/ThinkingIndicator";
import { TurnEvents } from "../chat/TurnEvents";

/** One Switchboard turn: user + steers + assistant. Mid-turn events live in the right rail. */
export const SwitchboardTurnCard = memo(function SwitchboardTurnCard({
  turn,
  title,
  cwd,
  session,
  onOpenRightRail,
  onOpen,
}: {
  turn: SwitchboardTurn;
  title: string;
  cwd?: string;
  session: Session | undefined;
  onOpenRightRail: (turnId: string, focusEventId?: string) => void;
  onOpen: (sessionId: string, turnId: string, eventId: string) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
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
  const openRail = useCallback(
    (eventId: string) => onOpenRightRail(turn.id, eventId),
    [onOpenRightRail, turn.id],
  );
  const handleOpenUserDetails = useCallback(
    () => openRail(turn.user.id),
    [openRail, turn.user.id],
  );
  const handleOpenAssistantDetails = useCallback(() => {
    if (!turn.assistant) return;
    openRail(turn.assistant.id);
  }, [openRail, turn.assistant]);
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
      >
        <div className="row">
          <span className="kind-pill">user</span>
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
          <span className="event-timestamp" style={{ marginLeft: "auto" }}>
            {formatDetailTimestamp(turn.at)}
          </span>
        </div>
        {turn.user.queued ? <div className="message-queued" role="status">Queued</div> : null}
        <MarkdownBody text={userText} />
        <div className="event-actions">
          <CopyEventButton text={userText} />
          <TurnDetailsButton onToggle={handleOpenUserDetails} />
        </div>
      </div>

      {session && steerEvents.length > 0 ? (
        <TurnEvents
          session={session}
          events={steerEvents}
          onActivate={turn.navigable ? handleOpenSession : undefined}
        />
      ) : null}
      {!session && steerEvents.length > 0 ? (
        <div className="turn-events">
          {steerEvents.map((item) => (
            <div key={item.id} className={`message ${item.role}`} data-event-id={item.id}>
              <div className="body">{item.text}</div>
            </div>
          ))}
        </div>
      ) : null}

      {running ? <ThinkingIndicator /> : null}

      {!running && turn.assistant ? (
        <div
          className={`message assistant${turn.fileChanges.length ? " has-file-changes" : ""}`}
          data-event-id={turn.assistant.id}
        >
          <div className="row">
            <span className="kind-pill">assistant</span>
            <span className="event-timestamp" style={{ marginLeft: "auto" }}>
              {formatDetailTimestamp(turn.assistant.at)}
            </span>
          </div>
          <MarkdownBody text={assistantText} />
          {turn.fileChanges.length ? (
            <FileChanges
              changes={turn.fileChanges}
              cwd={cwd}
              sessionId={turn.sessionId}
            />
          ) : null}
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
            <TurnDetailsButton onToggle={handleOpenAssistantDetails} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
