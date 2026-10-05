import type { FileChange } from "../../../shared/fileChange";
import { CompactFileChanges } from "./CompactFileChanges";
import { DetailedFileChanges } from "./DetailedFileChanges";
import "./fileChanges.css";

interface Props {
  changes: FileChange[];
  cwd?: string;
  sessionId?: string;
  status?: string;
  /** Filename chips (final assistant). Off = verbose tool-call labels in turn details. */
  compact?: boolean;
}

export function FileChanges({ changes, cwd, sessionId, status, compact }: Props) {
  if (compact) {
    return <CompactFileChanges changes={changes} cwd={cwd} sessionId={sessionId} />;
  }
  return (
    <DetailedFileChanges changes={changes} cwd={cwd} sessionId={sessionId} status={status} />
  );
}
