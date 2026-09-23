import type { MasterEvent } from "../../../shared/types";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";

export function MasterFileEvent({ event, title, cwd, onClick }: {
  event: MasterEvent;
  title: string;
  cwd?: string;
  onClick: (event: MasterEvent) => void;
}) {
  return (
    <div className="feed-item has-file-changes" data-find-text={`${title} ${event.summary}`}>
      <div className="row">
        <span className="kind-pill tool">files</span>
        <button type="button" className="file-event-link" disabled={!event.navigable} onClick={() => onClick(event)}>{title}</button>
        <span className="event-timestamp" style={{ marginLeft: "auto" }}>{formatDetailTimestamp(event.at)}</span>
      </div>
      <FileChanges changes={event.fileChanges ?? []} status={event.toolStatus} cwd={cwd} tabId={event.tabId} />
    </div>
  );
}
