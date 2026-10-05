import * as fs from "node:fs/promises";
import type { AgentKind, Session, SessionTab, SessionUsage } from "../shared/types";
import { sessionDir, sessionMetaPath } from "./userDataPaths";
import { normalizeSessionTabs, readTabsExpanded } from "./sessionTabs";

export interface SessionMeta {
  title: string;
  agent: AgentKind;
  cwd: string;
  agentSessionId: string | null;
  usage?: SessionUsage;
  tabs: SessionTab[];
  tabsExpanded: boolean;
}

export function sessionFromMeta(id: string, meta: SessionMeta | null): Session {
  return {
    id,
    title: meta?.title || id,
    agent: meta?.agent ?? "claude",
    cwd: meta?.cwd ?? "",
    agentSessionId: meta?.agentSessionId ?? null,
    status: "idle",
    error: null,
    createdAt: Date.now(),
    usage: meta?.usage,
    tabs: meta?.tabs ?? [],
    tabsExpanded: meta?.tabsExpanded ?? true,
  };
}

export function metaFromSession(session: Session): SessionMeta {
  return {
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    agentSessionId: session.agentSessionId,
    usage: session.usage,
    tabs: session.tabs,
    tabsExpanded: session.tabsExpanded,
  };
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
      tabs: normalizeSessionTabs(parsed.tabs),
      tabsExpanded: readTabsExpanded(parsed.tabsExpanded),
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
