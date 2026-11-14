import { useEffect } from "react";
import { explorerPersistence } from "./explorerPersistence";
import { explorerStore } from "./explorerStore";

let picking = false;

/** Open a chosen file in a permanent tab; cancellation leaves the current tabs alone. */
export function useOpenFileDialog(sessionId: string): void {
  useEffect(() => {
    const onOpenFile = async () => {
      if (picking) return;
      picking = true;
      try {
        const path = await window.switcheroo.pickSessionFile(sessionId);
        if (path === null) return;
        await explorerPersistence.ensureRestored(sessionId);
        explorerStore.openFile(sessionId, path);
      } catch (error) {
        console.error("[editor] open file failed:", error);
      } finally {
        picking = false;
      }
    };
    window.addEventListener("switcheroo:open-file", onOpenFile);
    return () => window.removeEventListener("switcheroo:open-file", onOpenFile);
  }, [sessionId]);
}
