import type { FindInSessionsHit, TranscriptTurn } from "../shared/types";
import type { AgentKind } from "../shared/types";
import { findInSessionSources } from "./findInSessionSources";
import { listSessionIdsOnDisk } from "./listSessionIdsOnDisk";
import { loadSessionMeta } from "./sessionMeta";
import { loadTranscript } from "./sessionTranscripts";

type FindSource = {
  sessionId: string;
  title: string;
  agent: AgentKind;
  turns: TranscriptTurn[];
};

type FindHost = {
  isCurrent: (token: number) => boolean;
  sessionIds: () => Iterable<string>;
  hydratedSource: (sessionId: string) => FindSource | null;
  send: (channel: string, payload: unknown) => void;
};

/** Uncapped disk+memory history search with chunked IPC progress. */
export async function runFindInSessions(
  host: FindHost,
  searchId: number,
  token: number,
  needle: string,
): Promise<void> {
  if (!host.isCurrent(token)) {
    host.send("find:done", { searchId, stopped: true });
    return;
  }
  if (!needle) {
    host.send("find:done", { searchId, stopped: false });
    return;
  }
  const ids = new Set(await listSessionIdsOnDisk());
  if (!host.isCurrent(token)) {
    host.send("find:done", { searchId, stopped: true });
    return;
  }
  for (const id of host.sessionIds()) ids.add(id);
  const ordered = [...ids].sort().reverse();
  const total = ordered.length;
  let scanned = 0;
  let matchCount = 0;
  const hits: FindInSessionsHit[] = [];
  let lastSentAt = 0;
  const flushProgress = (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastSentAt < 300) return;
    host.send("find:progress", {
      searchId,
      scanned,
      total,
      matchCount,
    });
    lastSentAt = now;
  };
  flushProgress(true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  for (const sessionId of ordered) {
    if (!host.isCurrent(token)) {
      flushProgress(true);
      await deliverFindHits(host, searchId, hits);
      host.send("find:done", { searchId, stopped: true });
      return;
    }
    let source = host.hydratedSource(sessionId);
    if (!source) {
      const meta = await loadSessionMeta(sessionId);
      if (meta) {
        source = {
          sessionId,
          title: meta.title,
          agent: meta.agent,
          turns: await loadTranscript(sessionId),
        };
      }
    }
    if (source) {
      const found = findInSessionSources([source], needle);
      if (found.length) {
        hits.push(...found);
        matchCount += found.length;
      }
    }
    scanned += 1;
    const before = lastSentAt;
    flushProgress(false);
    if (lastSentAt !== before) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
  const stopped = !host.isCurrent(token);
  flushProgress(true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  await deliverFindHits(host, searchId, hits);
  host.send("find:done", { searchId, stopped });
}

async function deliverFindHits(
  host: FindHost,
  searchId: number,
  hits: FindInSessionsHit[],
): Promise<void> {
  hits.sort((a, b) => b.at - a.at);
  const chunkSize = 100;
  for (let i = 0; i < hits.length; i += chunkSize) {
    host.send("find:chunk", { searchId, added: hits.slice(i, i + chunkSize) });
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}
