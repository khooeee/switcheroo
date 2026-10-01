import type { SwitchboardEvent, Session } from "../../../shared/types";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { CopyEventButton } from "../copy/CopyEventButton";
import { SwitchboardFileEvent } from "./SwitchboardFileEvent";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { switchboardEventCardProps } from "./switchboardEventCardProps";

interface Props {
  events: SwitchboardEvent[];
  sessions: Session[];
  onClick: (event: SwitchboardEvent) => void;
}

export function SwitchboardFeed({ events, sessions, onClick }: Props) {
  const titleFor = (event: SwitchboardEvent) =>
    sessions.find((session) => session.id === event.sessionId)?.title ?? event.sessionTitle ?? "Closed session";
  if (events.length === 0) {
    return (
      <div className="empty">
        Create a session with the plus (+) button on the top left hand corner.
      </div>
    );
  }

  const ordered = [...events].sort((a, b) => a.at - b.at);

  return (
    <div className="feed">
      {ordered.map((event) => {
        const title = titleFor(event);
        if (event.fileChanges?.length) {
          return <SwitchboardFileEvent key={event.id} event={event} title={title}
            cwd={sessions.find((session) => session.id === event.sessionId)?.cwd} onClick={onClick} />;
        }
        const detail = event.kind === "status" || event.kind === "tool" || event.kind === "permission";
        return (
        <div
          key={event.id + event.at}
          className={`feed-item${event.kind === "user" ? " user" : ""}${event.kind === "stopped" ? " stopped" : ""}${detail ? " detail" : ""}${event.navigable ? " navigable" : ""}`}
          data-find-text={`${title} ${event.summary}`}
          {...switchboardEventCardProps(event, title, onClick)}
        >
          <div className="row">
            <span className={`kind-pill ${event.kind}`}>{event.kind}</span>
            <span className="event-title">{title}</span>
            <span className="event-timestamp" style={{ marginLeft: "auto" }}>
              {formatDetailTimestamp(event.at)}
            </span>
          </div>
          {event.kind === "message" || event.kind === "user"
            ? <MarkdownBody text={event.summary} />
            : <div className="body">{event.summary}</div>}
          <div className="event-actions">
            <CopyEventButton text={event.summary} />
          </div>
        </div>
        );
      })}
    </div>
  );
}
