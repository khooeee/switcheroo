import { memo, type KeyboardEvent, type MouseEvent } from "react";
import type { Session, SwitchboardTurn } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ThinkingIndicator } from "../chat/ThinkingIndicator";
import { TurnEvents } from "../chat/TurnEvents";

/** One Switchboard turn: user + final assistant (or Thinking), with expandable events. */
export const SwitchboardTurnCard = memo(function SwitchboardTurnCard({
  turn,
  title,
  cwd,
  session,
  expanded,
  onToggle,
  onOpen,
}: {
  turn: SwitchboardTurn;
  title: string;
  cwd?: string;
  session: Session | undefined;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (turn: SwitchboardTurn) => void;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const userText =
    turn.agent === "cursor" ? stripCursorStreamNoise(turn.user.text) : turn.user.text;
  const assistantText = turn.assistant
    ? turn.agent === "cursor"
      ? stripCursorStreamNoise(turn.assistant.text)
      : turn.assistant.text
    : "";

  const toggleOnly = (event: MouseEvent | KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, summary, details")) return;
    event.stopPropagation();
    onToggle();
  };

  return (
    <div
      className={`session-turn switchboard-turn${expanded ? " expanded" : " collapsed"}${turn.navigable ? " navigable" : ""}`}
      data-turn-id={turn.id}
      data-find-text={`${title} ${userText} ${assistantText}`}
    >
      <div
        className={`message user turn-toggle${turn.user.queued ? " queued" : ""}`}
        data-event-id={turn.user.id}
        role="button"
        tabIndex={0}
        onClick={toggleOnly}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="row">
          <span
            className={`event-title${turn.navigable ? " openable" : ""}`}
            onClick={(e) => {
              if (!turn.navigable) return;
              e.stopPropagation();
              onOpen(turn);
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
        </div>
      </div>

      {expanded && session ? <TurnEvents session={session} events={turn.events} /> : null}
      {expanded && !session && turn.events.length > 0 ? (
        <div className="turn-events">
          {turn.events.map((item) => (
            <div key={item.id} className={`message ${item.role}`} data-event-id={item.id}>
              <div className="body">{item.text}</div>
            </div>
          ))}
        </div>
      ) : null}

      {running ? <ThinkingIndicator /> : null}

      {!running && turn.assistant ? (
        <div
          className={`message assistant turn-toggle${turn.fileChanges.length ? " has-file-changes" : ""}`}
          data-event-id={turn.assistant.id}
          role="button"
          tabIndex={0}
          onClick={toggleOnly}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <div className="row">
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
          </div>
        </div>
      ) : null}
    </div>
  );
});
