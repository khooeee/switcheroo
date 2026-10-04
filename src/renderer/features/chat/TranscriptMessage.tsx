import { memo } from "react";
import type { FileChange, Session, TranscriptItem } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ForkEventButton } from "../copy/ForkEventButton";
import { TurnDetailsButton } from "../copy/TurnDetailsButton";
import { QueuedStatus } from "./QueuedStatus";

/** Renders one transcript leaf (user / assistant / thought / tool / …). */
export const TranscriptMessage = memo(function TranscriptMessage({
  session,
  item,
  onActivate,
  onToggleDetails,
  extraFileChanges,
  forkable,
}: {
  session: Session;
  item: TranscriptItem;
  /** Whole-message click (e.g. Switchboard navigate). */
  onActivate?: () => void;
  /** Arrow control to the right of copy — toggles the turn-details rail. */
  onToggleDetails?: () => void;
  /** Turn boundaries only (user message, final reply); mid-turn events cannot be forked. */
  forkable?: boolean;
  /** Extra file changes shown under this message (aggregated turn files). */
  extraFileChanges?: FileChange[];
}) {
  const text =
    session.agent === "cursor" ? stripCursorStreamNoise(item.text) : item.text;
  const changes = extraFileChanges?.length ? extraFileChanges : item.fileChanges;
  const clickable = !!onActivate;
  const markdown =
    item.role === "assistant" || item.role === "user" || item.role === "thought";
  const showActions = forkable || !!text || !!onToggleDetails;

  const canFork = !!(forkable && session.supportsForkAtMessage);

  return (
    <div
      className={`message ${item.role}${changes?.length ? " has-file-changes" : ""}${item.queued ? " queued" : ""}${clickable ? " turn-toggle" : ""}`}
      data-event-id={item.id}
      data-find-text={text}
      data-copy-markdown={markdown && text ? text : undefined}
      data-fork-session={canFork ? session.id : undefined}
      data-fork-event={canFork ? item.id : undefined}
      onClick={
        clickable
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button, a, summary, details, input, textarea")) return;
              onActivate?.();
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {item.role !== "stopped" && (
        <div className="row">
          <span className="kind-pill">{item.role}</span>
          {item.queued ? <QueuedStatus /> : null}
          {item.toolStatus && <span className="tool-status">{item.toolStatus}</span>}
          <span className="event-timestamp">
            {formatDetailTimestamp(item.at)}
          </span>
        </div>
      )}
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
      {showActions ? (
        <div className="event-actions">
          {canFork ? (
            <ForkEventButton sessionId={session.id} eventId={item.id} />
          ) : null}
          {text ? <CopyEventButton text={text} /> : null}
          {onToggleDetails ? <TurnDetailsButton onToggle={onToggleDetails} /> : null}
        </div>
      ) : null}
    </div>
  );
});
