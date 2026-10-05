import type { SessionTab } from "../../shared/session";

/**
 * After closing the active child at `closedIndex`, prefer the next sibling,
 * then the previous one; only fall back to the parent when none remain.
 */
export function activeTabAfterChildClose(
  remaining: SessionTab[],
  closedIndex: number,
  parentSessionId: string,
): string {
  const next = remaining[closedIndex];
  if (next) return next.tabId;
  const prev = remaining[closedIndex - 1];
  if (prev) return prev.tabId;
  return parentSessionId;
}
