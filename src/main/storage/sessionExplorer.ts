import * as fs from "node:fs/promises";
import type { PersistedExplorer } from "../../shared/persistedExplorer";
import { isMissingFile } from "./isMissingFile";
import { parsePersistedExplorer } from "./parsePersistedExplorer";
import { sessionExplorerPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

/** Saved file explorer state for a session, or null when there is none (or it is unreadable). */
export async function loadSessionExplorer(sessionId: string): Promise<PersistedExplorer | null> {
  try {
    return parsePersistedExplorer(JSON.parse(await fs.readFile(sessionExplorerPath(sessionId), "utf8")));
  } catch (err) {
    if (!isMissingFile(err)) console.warn(`[files] explorer state for ${sessionId} unreadable:`, err);
    return null;
  }
}

export async function saveSessionExplorer(sessionId: string, state: PersistedExplorer): Promise<void> {
  await writeFileAtomic(sessionExplorerPath(sessionId), JSON.stringify(state, null, 2));
}
