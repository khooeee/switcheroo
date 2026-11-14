import { fileBufferStore } from "./fileBufferStore";

/** Shown when the file changed on disk under unsaved edits: take the disk version or keep yours. */
export function ConflictBar({ sessionId, path }: { sessionId: string; path: string }) {
  return (
    <div className="editor-conflict" role="alert">
      <span>This file changed on disk.</span>
      <button type="button" className="btn" onClick={() => void fileBufferStore.reload(sessionId, path, true)}>
        Reload
      </button>
      <button type="button" className="btn" onClick={() => fileBufferStore.keepMine(sessionId, path)}>
        Keep Mine
      </button>
    </div>
  );
}
