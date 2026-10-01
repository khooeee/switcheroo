import type { TranscriptTurn } from "../../shared/types";

/** `?last=N` keeps the newest N turns. */
export function applyTranscriptQuery(
  turns: TranscriptTurn[],
  params: URLSearchParams,
): TranscriptTurn[] {
  const raw = params.get("last");
  if (raw == null || raw === "") return turns;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return turns;
  if (n === 0) return [];
  return turns.slice(-Math.floor(n));
}
