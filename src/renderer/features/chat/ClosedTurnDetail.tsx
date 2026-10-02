import { memo } from "react";
import type { TranscriptTurn } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ThinkingIndicator } from "./ThinkingIndicator";

/** Plain turn body when the Switchboard session is no longer open. */
export const ClosedTurnDetail = memo(function ClosedTurnDetail({
  turn,
  agent,
  cwd,
  selectedEventId,
}: {
  turn: TranscriptTurn;
  agent?: string;
  cwd?: string;
  selectedEventId?: string | null;
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
        className={`message user${turn.user.queued ? " queued" : ""}${selectedEventId === turn.user.id ? " selected" : ""}`}
        data-event-id={turn.user.id}
        data-selected={selectedEventId === turn.user.id || undefined}
        tabIndex={-1}
      >
        <div className="row">
          <span className="kind-pill">user</span>
          <span className="event-timestamp" style={{ marginLeft: "auto" }}>
            {formatDetailTimestamp(turn.user.at)}
          </span>
        </div>
        {turn.user.queued ? <div className="message-queued" role="status">Queued</div> : null}
        <MarkdownBody text={userText} />
        <div className="event-actions">
          <CopyEventButton text={userText} />
        </div>
      </div>

      {turn.events.length > 0 ? (
        <div className="turn-events">
          {turn.events.map((item) => (
            <div
              key={item.id}
              className={`message ${item.role}${selectedEventId === item.id ? " selected" : ""}`}
              data-event-id={item.id}
              data-selected={selectedEventId === item.id || undefined}
              tabIndex={-1}
            >
              <div className="row">
                <span className="kind-pill">{item.role}</span>
                <span className="event-timestamp" style={{ marginLeft: "auto" }}>
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
          className={`message assistant${turn.fileChanges.length ? " has-file-changes" : ""}${selectedEventId === turn.assistant.id ? " selected" : ""}`}
          data-event-id={turn.assistant.id}
          data-selected={selectedEventId === turn.assistant.id || undefined}
          tabIndex={-1}
        >
          <div className="row">
            <span className="kind-pill">assistant</span>
            <span className="event-timestamp" style={{ marginLeft: "auto" }}>
              {formatDetailTimestamp(turn.assistant.at)}
            </span>
          </div>
          <MarkdownBody text={assistantText} />
          {turn.fileChanges.length ? (
            <FileChanges changes={turn.fileChanges} cwd={cwd} />
          ) : null}
          <div className="event-actions">
            <CopyEventButton text={assistantText} />
          </div>
        </div>
      ) : null}
    </div>
  );
});
