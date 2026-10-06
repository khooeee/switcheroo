export type RightRailSelection = {
  sessionId: string;
  turnId: string;
  focusEventId?: string;
  focusKey: number;
  /** Set when the rail shows a subagent transcript instead of one turn (`turnId` is then empty). */
  subagentId?: string;
};

/** Select a turn (and focus event) in the right rail; bumps `focusKey` so re-selecting re-flashes. */
export function nextRightRailSelection(
  prev: RightRailSelection | null,
  sessionId: string,
  turnId: string,
  focusEventId?: string,
): RightRailSelection {
  return {
    sessionId,
    turnId,
    focusEventId,
    focusKey: (prev?.focusKey ?? 0) + 1,
  };
}
