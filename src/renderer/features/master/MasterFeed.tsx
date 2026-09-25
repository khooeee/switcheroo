import type { MasterEvent, SessionTab } from "../../../shared/types";
import { MarkdownBody } from "../markdown/MarkdownBody";
import { MasterFileEvent } from "./MasterFileEvent";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { masterEventCardProps } from "./masterEventCardProps";

interface Props {
  events: MasterEvent[];
  tabs: SessionTab[];
  onClick: (event: MasterEvent) => void;
}

export function MasterFeed({ events, tabs, onClick }: Props) {
  const titleFor = (tabId: string) => tabs.find((tab) => tab.id === tabId)?.title ?? "Closed session";
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
        const title = titleFor(event.tabId);
        if (event.fileChanges?.length) {
          return <MasterFileEvent key={event.id} event={event} title={title}
            cwd={tabs.find((tab) => tab.id === event.tabId)?.cwd} onClick={onClick} />;
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
        </div>
        );
      })}
    </div>
  );
}
