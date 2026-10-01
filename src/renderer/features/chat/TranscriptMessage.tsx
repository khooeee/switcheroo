import type { FileChange, Session, TranscriptItem } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ForkEventButton } from "../copy/ForkEventButton";

/** Renders one transcript leaf (user / assistant / thought / tool / …). */
export function TranscriptMessage({
  session,
  item,
  onActivate,
  extraFileChanges,
}: {
  session: Session;
  item: TranscriptItem;
  onActivate?: () => void;
  /** Extra file changes shown under this message (aggregated turn files). */
  extraFileChanges?: FileChange[];
}) {
  const text =
    session.agent === "cursor" ? stripCursorStreamNoise(item.text) : item.text;
  const changes = extraFileChanges?.length ? extraFileChanges : item.fileChanges;
  const clickable = !!onActivate;
  const markdown =
    item.role === "assistant" || item.role === "user" || item.role === "thought";

  return (
    <div
      className={`message ${item.role}${changes?.length ? " has-file-changes" : ""}${item.queued ? " queued" : ""}${clickable ? " turn-toggle" : ""}`}
      data-event-id={item.id}
      data-find-text={text}
      onClick={
        clickable
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button, a, summary, details, input, textarea")) return;
              onActivate();
            }
          : undefined
      }
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {item.role !== "stopped" && (
        <div className="row">
          {item.role !== "user" && item.role !== "assistant" ? (
            <span className="kind-pill">{item.role}</span>
          ) : null}
          {item.toolStatus && <span className="tool-status">{item.toolStatus}</span>}
          <span className="event-timestamp" style={{ marginLeft: "auto" }}>
            {formatDetailTimestamp(item.at)}
          </span>
        </div>
      )}
      {item.queued ? (
        <div className="message-queued" role="status">Queued</div>
      ) : null}
      {changes?.length ? (
        <>
          {markdown && text ? <MarkdownBody text={text} /> : null}
          {!markdown && text && !item.fileChanges?.length ? <div className="body">{text}</div> : null}
          <FileChanges
            changes={changes}
            status={item.toolStatus}
            cwd={session.cwd}
            sessionId={session.id}
          />
        </>
      ) : markdown ? (
        <MarkdownBody text={text} />
      ) : (
        <div className="body">{text}</div>
      )}
      <div className="event-actions">
        <ForkEventButton sessionId={session.id} eventId={item.id} />
        {text ? <CopyEventButton text={text} /> : null}
      </div>
    </div>
  );
}
