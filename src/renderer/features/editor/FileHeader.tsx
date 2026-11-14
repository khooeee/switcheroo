import { useState } from "react";
import { isMarkdownFile } from "../files/isMarkdownFile";
import { MarkdownPreviewModal } from "../files/MarkdownPreviewModal";
import { OpenInCursor } from "../files/OpenInCursor";
import { fileBufferStore } from "./fileBufferStore";

/** Path of the active file, with Preview (Markdown, as currently edited) and Open in Cursor. */
export function FileHeader({ sessionId, path }: { sessionId: string; path: string }) {
  const [preview, setPreview] = useState<string | null>(null);

  const showPreview = () => {
    const buffer = fileBufferStore.get(sessionId, path);
    if (buffer?.kind === "text") setPreview(buffer.live.state.doc.toString());
  };

  return (
    <div className="file-header">
      <span className="file-header-path" title={path}>{path}</span>
      {isMarkdownFile(path) ? (
        <button type="button" className="file-open-button" onClick={showPreview}>Preview</button>
      ) : null}
      <OpenInCursor sessionId={sessionId} filePath={path} />
      {preview !== null ? (
        <MarkdownPreviewModal path={path} text={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
