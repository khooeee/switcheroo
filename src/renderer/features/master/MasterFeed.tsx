import type { MasterEvent, SessionTab } from "../../../shared/types";

interface Props {
  events: MasterEvent[];
  tabs: SessionTab[];
  onClick: (event: MasterEvent) => void;
  query: string;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function MasterFeed({ events, tabs, onClick, query }: Props) {
  const titleFor = (tabId: string) => tabs.find((tab) => tab.id === tabId)?.title ?? "Closed session";
  const filtered = query.trim()
    ? events.filter((e) => {
        const title = titleFor(e.tabId).toLowerCase();
        const q = query.toLowerCase();
        return e.summary.toLowerCase().includes(q) || title.includes(q);
      })
    : events;

  if (events.length === 0) {
    return (
      <div className="empty">
        Switchboard collects events from every session tab.
        <br />
        Create a tab with + to start an agent.
      </div>
    );
  }

  const ordered = [...filtered].sort((a, b) => a.at - b.at);

  return (
    <div className="feed">
      {ordered.map((event) => {
        const title = titleFor(event.tabId);
        const detail = event.kind === "status" || event.kind === "tool";
        return (
        <button
          key={event.id + event.at}
          type="button"
          className={`feed-item${event.kind === "user" ? " user" : ""}${event.kind === "stopped" ? " stopped" : ""}${detail ? " detail" : ""}`}
          disabled={!event.navigable}
          onClick={() => onClick(event)}
          data-find-text={`${title} ${event.summary}`}
        >
          <div className="row">
            <span className={`kind-pill ${event.kind}`}>{event.kind}</span>
            <span>{title}</span>
            <span style={{ marginLeft: "auto" }}>
              {new Date(event.at).toLocaleTimeString()}
            </span>
          </div>
          <div className="body">{highlight(event.summary, query)}</div>
        </button>
        );
      })}
    </div>
  );
}
