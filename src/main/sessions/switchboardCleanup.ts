const DAY_MS = 24 * 60 * 60 * 1000;

/** Epoch ms cutoff for turns to keep; null means cleanup is disabled. */
export function switchboardCleanupCutoff(days: number, now = Date.now()): number | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  return now - days * DAY_MS;
}
