import * as fs from "node:fs/promises";
import type { AgentKind, SlashCommand } from "../shared/types";
import { sessionDir, sessionMetaPath } from "./userDataPaths";

export interface SessionMeta {
  title: string;
  agentKind: AgentKind;
  cwd: string;
  sessionId: string | null;
  notesWidth?: number;
  slashCommands?: SlashCommand[];
}

let pendingSave: Promise<void> = Promise.resolve();

export async function loadSessionMeta(tabId: string): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(sessionMetaPath(tabId), "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as SessionMeta;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveSessionMeta(tabId: string, meta: SessionMeta): Promise<void> {
  const target = sessionMetaPath(tabId);
  const tmp = `${target}.${process.pid}.tmp`;
  const snapshot = JSON.stringify(meta, null, 2);
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionDir(tabId), { recursive: true });
    await fs.writeFile(tmp, snapshot, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}

export async function deleteSessionFolder(tabId: string): Promise<void> {
  await fs.rm(sessionDir(tabId), { recursive: true, force: true });
}
