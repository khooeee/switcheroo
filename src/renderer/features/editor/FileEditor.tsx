import { useEffect } from "react";
import { CodeEditor } from "./CodeEditor";
import { ConflictBar } from "./ConflictBar";
import { fileBufferStore } from "./fileBufferStore";
import { formatBytes } from "./formatBytes";
import { useFileBuffer } from "./useFileBuffer";

/** The active tab's body: the code editor for text, the picture for images, else why it cannot open. */
export function FileEditor({ sessionId, path }: { sessionId: string; path: string }) {
  const buffer = useFileBuffer(sessionId, path);
  const unloaded = buffer === undefined;

  // Also after the buffer is dropped (edits discarded while the tab stays open).
  useEffect(() => {
    if (unloaded) void fileBufferStore.load(sessionId, path);
  }, [sessionId, path, unloaded]);

  if (!buffer || buffer.kind === "loading") return <div className="file-editor-note">Loading…</div>;
  switch (buffer.kind) {
    case "text":
      return (
        <>
          {buffer.conflictMtimeMs !== null ? <ConflictBar sessionId={sessionId} path={path} /> : null}
          <CodeEditor sessionId={sessionId} path={path} live={buffer.live} />
        </>
      );
    case "image":
      return (
        <div className="file-editor-image">
          <img src={buffer.dataUrl} alt={path} />
        </div>
      );
    case "binary":
      return <div className="file-editor-note">This is a binary file ({formatBytes(buffer.size)}).</div>;
    case "tooLarge":
      return <div className="file-editor-note">This file is too large to open here ({formatBytes(buffer.size)}).</div>;
    case "missing":
      return <div className="file-editor-note">This file no longer exists.</div>;
    case "error":
      return <div className="file-editor-note">{buffer.message}</div>;
  }
}
