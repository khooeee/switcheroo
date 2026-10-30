import { memo, useCallback, useMemo } from "react";
import type { Session } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { TranscriptImages } from "../images/TranscriptImages";
import { turnImages } from "../images/turnImages";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { SaveMarkdownButton } from "../copy/SaveMarkdownButton";
import { TurnDetailsButton } from "../copy/TurnDetailsButton";
import { ThinkingIndicator } from "../chat/ThinkingIndicator";
import { QueuedStatus } from "../chat/QueuedStatus";
import { steerEvents } from "../chat/steerEvents";
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
  const userText = stripCursorStreamNoise(turn.agent, turn.user.text);
  const assistantText = stripCursorStreamNoise(turn.agent, turn.assistant?.text ?? "");
  const steers = useMemo(() => steerEvents(turn.events), [turn.events]);
  const images = useMemo(() => turnImages(turn.events), [turn.events]);
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
          <SaveMarkdownButton text={userText} />
          <TurnDetailsButton onToggle={openUser} />
        </div>
      </div>

      {messageSession && steers.length > 0 ? (
        <TurnEvents
          session={messageSession}
          events={steers}
          onActivate={turn.navigable ? handleOpenSession : undefined}
        />
      ) : null}
      {!messageSession && steers.length > 0 ? (
        <div className="turn-events">
          {steers.map((item) => (
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
          <TranscriptImages names={images} />
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
          <SaveMarkdownButton text={assistantText} />
            <TurnDetailsButton onToggle={openAssistant} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
