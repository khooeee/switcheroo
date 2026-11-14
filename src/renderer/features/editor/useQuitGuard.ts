import { useEffect } from "react";
import { explorerPersistence } from "../explorer/explorerPersistence";
import { fileBufferStore } from "./fileBufferStore";
import { resolveUnsavedFiles } from "./resolveUnsavedFiles";

/** Before the app quits: settle unsaved files (main waits for the answer) and write pending explorer state. */
export function useQuitGuard(): void {
  useEffect(() => window.switcheroo.onPrepareQuit(({ requestId }) => {
    void resolveUnsavedFiles(fileBufferStore.dirtyFiles())
      .then((files) => files !== null, () => false)
      .then(async (ok) => {
        await explorerPersistence.flush();
        window.switcheroo.quitReady(requestId, ok);
      });
  }), []);
}
