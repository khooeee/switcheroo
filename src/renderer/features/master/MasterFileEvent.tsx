import type { MasterEvent } from "../../../shared/types";
import { FileChanges } from "../files/FileChanges";

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
        <span className="event-timestamp" style={{ marginLeft: "auto" }}>{new Date(event.at).toLocaleTimeString()}</span>
      </div>
      <FileChanges changes={event.fileChanges ?? []} status={event.toolStatus} cwd={cwd} />
    </div>
  );
}
