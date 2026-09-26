import * as fs from "node:fs/promises";
import type { AgentKind } from "../shared/types";
import { sessionDir, sessionMetaPath } from "./userDataPaths";

export interface SessionMeta {
  title: string;
  agentKind: AgentKind;
  cwd: string;
  agentSessionId: string | null;
  notesWidth?: number;
}

let pendingSave: Promise<void> = Promise.resolve();

export async function loadSessionMeta(sessionId: string): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(sessionMetaPath(sessionId), "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as SessionMeta & { sessionId?: string | null };
    return {
      title: parsed.title,
      agentKind: parsed.agentKind,
      cwd: parsed.cwd,
      agentSessionId: parsed.agentSessionId ?? parsed.sessionId ?? null,
      notesWidth: parsed.notesWidth,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveSessionMeta(sessionId: string, meta: SessionMeta): Promise<void> {
  const target = sessionMetaPath(sessionId);
  const tmp = `${target}.${process.pid}.tmp`;
  const snapshot = JSON.stringify(meta, null, 2);
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionDir(sessionId), { recursive: true });
    await fs.writeFile(tmp, snapshot, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
