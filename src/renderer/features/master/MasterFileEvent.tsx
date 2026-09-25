import type { MasterEvent } from "../../../shared/types";
import { FileChanges } from "../files/FileChanges";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { masterEventCardProps } from "./masterEventCardProps";

export function MasterFileEvent({ event, title, cwd, onClick }: {
  event: MasterEvent;
  title: string;
  cwd?: string;
  onClick: (event: MasterEvent) => void;
}) {
  return (
    <div
      className={`feed-item has-file-changes${event.navigable ? " navigable" : ""}`}
      data-find-text={`${title} ${event.summary}`}
      {...masterEventCardProps(event, title, onClick)}
    >
      <div className="row">
        <span className="kind-pill tool">files</span>
        <span className="event-title">{title}</span>
        <span className="event-timestamp" style={{ marginLeft: "auto" }}>{formatDetailTimestamp(event.at)}</span>
      </div>
      <FileChanges changes={event.fileChanges ?? []} status={event.toolStatus} cwd={cwd} tabId={event.tabId} />
    </div>
  );
}
