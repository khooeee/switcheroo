export type ComposerHistoryState = {
  /** Index into newest-first history while browsing; null when live. */
  index: number | null;
  /** After a user edit while browsing, Up/Down stop until the draft is cleared. */
  locked: boolean;
};

export const emptyComposerHistory: ComposerHistoryState = { index: null, locked: false };

/** Apply Up/Down on an empty (or already browsing) composer. Returns null if ignored. */
export function applyComposerHistoryKey(
  state: ComposerHistoryState,
  key: "ArrowUp" | "ArrowDown",
  draft: string,
  history: string[],
): { state: ComposerHistoryState; draft: string } | null {
  if (state.locked || history.length === 0) return null;

  if (state.index === null) {
    if (key !== "ArrowUp" || draft !== "") return null;
    return { state: { index: 0, locked: false }, draft: history[0]! };
  }

  if (key === "ArrowUp") {
    const next = Math.min(state.index + 1, history.length - 1);
    if (next === state.index) return { state, draft: history[next]! };
    return { state: { index: next, locked: false }, draft: history[next]! };
  }

  if (state.index === 0) return { state: emptyComposerHistory, draft: "" };
  const next = state.index - 1;
  return { state: { index: next, locked: false }, draft: history[next]! };
}

/** User typed or pasted; lock out of cycling until the draft is empty again. */
export function applyComposerHistoryEdit(
  state: ComposerHistoryState,
  text: string,
): ComposerHistoryState {
  if (text === "") return emptyComposerHistory;
  if (state.index !== null) return { index: null, locked: true };
  return state;
}
