export type RightRailSelection = {
  sessionId: string;
  turnId: string;
  focusEventId?: string;
  focusKey: number;
  /** Set when the rail shows a subagent transcript instead of one turn (`turnId` is then empty). */
  subagentId?: string;
};

/** Unique across tabs, so a tab never mistakes a new selection for the one it last showed. */
let lastFocusKey = 0;

/** Select a turn (and focus event) in the right rail; a new `focusKey` makes re-selecting re-flash. */
export function nextRightRailSelection(
  sessionId: string,
  turnId: string,
  focusEventId?: string,
): RightRailSelection {
  lastFocusKey += 1;
  return {
    sessionId,
    turnId,
    focusEventId,
    focusKey: lastFocusKey,
  };
}
