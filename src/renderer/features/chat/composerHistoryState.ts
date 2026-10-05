export type ComposerHistoryState = {
  /** Index into newest-first history while browsing; null when live. */
  index: number | null;
  /** After a user edit while browsing, Up/Down stop until the draft is cleared. */
  locked: boolean;
};

export const emptyComposerHistory: ComposerHistoryState = { index: null, locked: false };
