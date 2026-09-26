import type { MasterEvent, Session } from "../../../shared/types";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { CopyEventButton } from "../copy/CopyEventButton";
import { MasterFileEvent } from "./MasterFileEvent";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { masterEventCardProps } from "./masterEventCardProps";

interface Props {
  events: MasterEvent[];
  sessions: Session[];
  onClick: (event: MasterEvent) => void;
}

export function MasterFeed({ events, sessions, onClick }: Props) {
  const titleFor = (event: MasterEvent) =>
    sessions.find((tab) => tab.id === event.sessionId)?.title ?? event.sessionTitle ?? "Closed session";
  if (events.length === 0) {
    return (
      <div className="empty">
        Switchboard collects events from every session tab.
        <br />
        Create a tab with + to start an agent.
      </div>
    );
  }

  const ordered = [...events].sort((a, b) => a.at - b.at);

  return (
    <div className="feed">
      {ordered.map((event) => {
        const title = titleFor(event);
        if (event.fileChanges?.length) {
          return <MasterFileEvent key={event.id} event={event} title={title}
            cwd={sessions.find((tab) => tab.id === event.sessionId)?.cwd} onClick={onClick} />;
        }
        const detail = event.kind === "status" || event.kind === "tool" || event.kind === "permission";
        return (
        <div
          key={event.id + event.at}
          className={`feed-item${event.kind === "user" ? " user" : ""}${event.kind === "stopped" ? " stopped" : ""}${detail ? " detail" : ""}${event.navigable ? " navigable" : ""}`}
          data-find-text={`${title} ${event.summary}`}
          {...masterEventCardProps(event, title, onClick)}
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
