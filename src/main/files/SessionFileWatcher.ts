import { watch, type FSWatcher } from "node:fs";
import * as path from "node:path";
import type { WebContents } from "electron";
import { errorMessage } from "../../shared/errorMessage";

/** Coalesce bursts (saves, git checkouts) into one message. */
const DEBOUNCE_MS = 150;
/** Past this many paths in one burst, tell the renderer to re-read everything it shows. */
const MAX_PATHS = 500;

interface Watch {
  watcher: FSWatcher;
  sender: WebContents;
  pending: Set<string>;
  overflow: boolean;
  timer: NodeJS.Timeout | null;
}

function ignored(rel: string): boolean {
  return rel === ".git" || rel.startsWith(".git/");
}

/** One recursive watch per session cwd while its explorer is on screen; sends `files:changed`. */
export class SessionFileWatcher {
  private readonly watches = new Map<string, Watch>();

  watch(sessionId: string, cwd: string, sender: WebContents): void {
    if (this.watches.has(sessionId) || !cwd) return;
    let watcher: FSWatcher;
    try {
      watcher = watch(cwd, { recursive: true }, (_event, filename) => {
        const entry = this.watches.get(sessionId);
        if (!entry) return;
        if (filename) {
          const rel = String(filename).split(path.sep).join("/");
          if (ignored(rel)) return;
          if (entry.pending.size < MAX_PATHS) entry.pending.add(rel);
          else entry.overflow = true;
        } else {
          entry.overflow = true;
        }
        entry.timer ??= setTimeout(() => this.flush(sessionId), DEBOUNCE_MS);
      });
    } catch (err) {
      console.warn(`[files] cannot watch ${cwd}:`, errorMessage(err));
      return;
    }
    watcher.on("error", (err) => {
      console.warn(`[files] stopped watching ${cwd}:`, errorMessage(err));
      this.unwatch(sessionId);
    });
    this.watches.set(sessionId, { watcher, sender, pending: new Set(), overflow: false, timer: null });
  }

  unwatch(sessionId: string): void {
    const entry = this.watches.get(sessionId);
    if (!entry) return;
    this.watches.delete(sessionId);
    if (entry.timer) clearTimeout(entry.timer);
    entry.watcher.close();
  }

  dispose(): void {
    for (const sessionId of [...this.watches.keys()]) this.unwatch(sessionId);
  }

  private flush(sessionId: string): void {
    const entry = this.watches.get(sessionId);
    if (!entry) return;
    const paths = entry.overflow ? null : [...entry.pending];
    entry.pending.clear();
    entry.overflow = false;
    entry.timer = null;
    if (entry.sender.isDestroyed()) {
      this.unwatch(sessionId);
      return;
    }
    entry.sender.send("files:changed", { sessionId, paths });
  }
}
