export type RightRailSelection = {
  sessionId: string;
  turnId: string;
  focusEventId?: string;
  focusKey: number;
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
