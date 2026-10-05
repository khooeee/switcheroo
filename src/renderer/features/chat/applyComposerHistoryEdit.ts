import { emptyComposerHistory, type ComposerHistoryState } from "./composerHistoryState";

/** User typed or pasted; lock out of cycling until the draft is empty again. */
export function applyComposerHistoryEdit(
  state: ComposerHistoryState,
  text: string,
): ComposerHistoryState {
  if (text === "") return emptyComposerHistory;
  if (state.index !== null) return { index: null, locked: true };
  return state;
}
