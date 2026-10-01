import { memo, type RefObject } from "react";
import type { Session, TranscriptItem } from "../../../shared/types";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { ForkEventButton } from "../copy/ForkEventButton";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { useFocusTranscriptEvent } from "./useFocusTranscriptEvent";

export const SessionTranscript = memo(function SessionTranscript({
  session,
  items,
  focusEventId,
  focusEventKey,
  chatRef,
}: {
  session: Session;
  items: TranscriptItem[];
  focusEventId: string | null;
  focusEventKey: number;
  chatRef: RefObject<HTMLDivElement | null>;
}) {
  useFocusTranscriptEvent(focusEventId, focusEventKey, session.id, items);

  return (
    <>
      <div className="scroll" ref={chatRef}>
        <div className="transcript">
          {items.length === 0 && session.status !== "running" && session.status !== "connecting" && (
            <div className="empty">
              Send a prompt to start this session.
            </div>
          )}
          {items.map((item) => {
            const text =
              session.agent === "cursor" ? stripCursorStreamNoise(item.text) : item.text;
            return (
              <div
                key={item.id}
                className={`message ${item.role}${item.fileChanges?.length ? " has-file-changes" : ""}${item.queued ? " queued" : ""}`}
                data-event-id={item.id}
                data-find-text={text}
              >
                {item.role !== "stopped" && <div className="row">
                  <span className="kind-pill">{item.role}</span>
                  {item.toolStatus && <span className="tool-status">{item.toolStatus}</span>}
                  <span className="event-timestamp" style={{ marginLeft: "auto" }}>
                    {formatDetailTimestamp(item.at)}
                  </span>
                </div>}
                {item.queued ? (
                  <div className="message-queued" role="status">Queued</div>
                ) : null}
                {item.fileChanges?.length ? (
                  <FileChanges changes={item.fileChanges} status={item.toolStatus} cwd={session.cwd} sessionId={session.id} />
                ) : item.role === "assistant" || item.role === "user" || item.role === "thought"
                  ? <MarkdownBody text={text} />
                  : <div className="body">{text}</div>}
                <div className="event-actions">
                  <ForkEventButton sessionId={session.id} eventId={item.id} />
                  {text ? <CopyEventButton text={text} /> : null}
                </div>
              </div>
            );
          })}
          {session.status === "running" && <ThinkingIndicator />}
          {session.status === "connecting" && <ThinkingIndicator label="Creating session" />}
        </div>
      </div>
      <div className="scroll-fade" aria-hidden="true" />
    </>
  );
});
