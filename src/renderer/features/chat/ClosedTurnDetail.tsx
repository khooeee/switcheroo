import { memo } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { QueuedStatus } from "./QueuedStatus";

/** Plain turn body when the Switchboard session is no longer open. */
export const ClosedTurnDetail = memo(function ClosedTurnDetail({
  turn,
  agent,
  cwd,
}: {
  turn: TranscriptTurn;
  agent?: string;
  cwd?: string;
}) {
  const running = turn.status === "running" && !turn.user.queued;
  const userText = agent === "cursor" ? stripCursorStreamNoise(turn.user.text) : turn.user.text;
  const assistantText = turn.assistant
    ? agent === "cursor"
      ? stripCursorStreamNoise(turn.assistant.text)
      : turn.assistant.text
    : "";

  return (
    <div className="session-turn" data-turn-id={turn.id}>
      <div
        className={`message user${turn.user.queued ? " queued" : ""}`}
        data-event-id={turn.user.id}
        data-copy-markdown={userText || undefined}
      >
        <div className="row">
          <span className="kind-pill">user</span>
          {turn.user.queued ? <QueuedStatus /> : null}
          <span className="event-timestamp">
            {formatDetailTimestamp(turn.user.at)}
          </span>
        </div>
        <MarkdownBody text={userText} />
        <div className="event-actions">
          <CopyEventButton text={userText} />
        </div>
      </div>

      {turn.events.length > 0 ? (
        <div className="turn-events">
          {turn.events.map((item) => (
            <div key={item.id} className={`message ${item.role}`} data-event-id={item.id}>
              <div className="row">
                <span className="kind-pill">{item.role}</span>
                <span className="event-timestamp">
                  {formatDetailTimestamp(item.at)}
                </span>
              </div>
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
          data-copy-markdown={assistantText || undefined}
        >
          <div className="row">
            <span className="kind-pill">assistant</span>
            <span className="event-timestamp">
              {formatDetailTimestamp(turn.assistant.at)}
            </span>
          </div>
          <MarkdownBody text={assistantText} />
          {turn.fileChanges.length ? (
            <FileChanges changes={turn.fileChanges} cwd={cwd} compact />
          ) : null}
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
