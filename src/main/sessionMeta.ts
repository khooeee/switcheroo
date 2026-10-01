import * as fs from "node:fs/promises";
import type { AgentKind, SessionUsage } from "../shared/types";
import { sessionDir, sessionMetaPath } from "./userDataPaths";

export interface SessionMeta {
  title: string;
  agent: AgentKind;
  cwd: string;
  agentSessionId: string | null;
  usage?: SessionUsage;
}

let pendingSave: Promise<void> = Promise.resolve();

function readUsage(value: unknown): SessionUsage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const used = (value as SessionUsage).used;
  const size = (value as SessionUsage).size;
  if (!Number.isFinite(used) || !Number.isFinite(size)) return undefined;
  const cost = (value as SessionUsage).cost;
  return {
    used,
    size,
    cost:
      cost && Number.isFinite(cost.amount) && typeof cost.currency === "string"
        ? { amount: cost.amount, currency: cost.currency }
        : undefined,
  };
}

export async function loadSessionMeta(sessionId: string): Promise<SessionMeta | null> {
  try {
    const raw = await fs.readFile(sessionMetaPath(sessionId), "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as SessionMeta & { sessionId?: string | null };
    return {
      title: parsed.title,
      agent: parsed.agent,
      cwd: parsed.cwd,
      agentSessionId: parsed.agentSessionId ?? parsed.sessionId ?? null,
      usage: readUsage(parsed.usage),
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
