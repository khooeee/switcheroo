import type { Session } from "../../../shared/types";

/** Pinned then unpinned — rail order for shortcuts / lookup (never stored as source of truth). */
export function flatRailSessions(pinned: Session[], unpinned: Session[]): Session[] {
  return [...pinned, ...unpinned];
}
