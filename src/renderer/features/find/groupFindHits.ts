import type { FindInSessionsHit } from "../../../shared/findInSessionsHit";

interface FindHistoryGroup {
  sessionId: string;
  title: string;
  hits: FindInSessionsHit[];
}

/** Group timestamp-desc hits by session (session order = newest match first). */
export function groupFindHits(hits: FindInSessionsHit[]): FindHistoryGroup[] {
  const groups = new Map<string, FindHistoryGroup>();
  const order: string[] = [];
  for (const hit of hits) {
    let group = groups.get(hit.sessionId);
    if (!group) {
      group = { sessionId: hit.sessionId, title: hit.title, hits: [] };
      groups.set(hit.sessionId, group);
      order.push(hit.sessionId);
    }
    group.hits.push(hit);
  }
  return order.map((id) => groups.get(id)!);
}
