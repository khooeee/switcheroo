import * as fs from "node:fs/promises";
import { isAgentKind, type AgentKind } from "../shared/agentKind";
import type { SessionTab, SessionUsage } from "../shared/session";
import { isMissingFile } from "./isMissingFile";
import { sessionMetaPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

export interface SessionMeta {
  title: string;
  agent: AgentKind;
  cwd: string;
  agentSessionId: string | null;
  usage?: SessionUsage;
  switcherooAware?: boolean;
  tabs: SessionTab[];
  tabsExpanded: boolean;
}

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
    const parsed = JSON.parse(raw) as SessionMeta;
    // A session of an agent Switcheroo no longer runs (e.g. Prime Agent) cannot reopen.
    if (!isAgentKind(parsed.agent)) return null;
    return {
      title: parsed.title,
      agent: parsed.agent,
      cwd: parsed.cwd,
      agentSessionId: parsed.agentSessionId ?? null,
      usage: readUsage(parsed.usage),
      switcherooAware: parsed.switcherooAware === true || undefined,
      tabs: Array.isArray(parsed.tabs) ? parsed.tabs : [],
      tabsExpanded: parsed.tabsExpanded !== false,
    };
  } catch (err) {
    if (isMissingFile(err)) return null;
    throw err;
  }
}

export async function saveSessionMeta(sessionId: string, meta: SessionMeta): Promise<void> {
  await writeFileAtomic(sessionMetaPath(sessionId), JSON.stringify(meta, null, 2));
}
