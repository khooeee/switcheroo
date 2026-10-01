import type { SwitchboardEvent } from "../../../shared/types";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { CopyEventButton } from "../copy/CopyEventButton";
import { switchboardEventCardProps } from "./switchboardEventCardProps";

export function SwitchboardFileEvent({ event, title, cwd, onClick }: {
  event: SwitchboardEvent;
  title: string;
  cwd?: string;
  onClick: (event: SwitchboardEvent) => void;
}) {
  return (
    <div
      className={`feed-item has-file-changes${event.navigable ? " navigable" : ""}`}
      data-find-text={`${title} ${event.summary}`}
      {...switchboardEventCardProps(event, title, onClick)}
    >
      <div className="row">
        <span className="kind-pill tool">files</span>
        <span className="event-title">{title}</span>
        <span className="event-timestamp" style={{ marginLeft: "auto" }}>{formatDetailTimestamp(event.at)}</span>
      </div>
      <FileChanges changes={event.fileChanges ?? []} status={event.toolStatus} cwd={cwd} sessionId={event.sessionId} />
      <div className="event-actions">
        <CopyEventButton text={event.summary} />
      </div>
    </div>
  );
}
