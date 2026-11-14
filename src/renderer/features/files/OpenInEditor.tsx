import { useState } from "react";
import { openInEditor } from "../explorer/openInEditor";
import { projectRelativePath } from "./projectRelativePath";

/** Opens the file in File Explorer mode's editor; parent owns the surrounding `.file-open` row. */
export function OpenInEditor({ sessionId, cwd, filePath }: { sessionId: string; cwd: string; filePath: string }) {
  const [error, setError] = useState<string | null>(null);
  const open = () => {
    const path = projectRelativePath(filePath, cwd);
    setError(path ? null : `${filePath} is outside the project folder.`);
    if (path) void openInEditor(sessionId, path);
  };
  return (
    <>
      <button type="button" className="file-open-button" data-tooltip={`Open ${filePath} in Editor`} onClick={open}>
        Open in Editor
      </button>
      {error && <span className="file-open-error" role="alert">{error}</span>}
    </>
  );
}
