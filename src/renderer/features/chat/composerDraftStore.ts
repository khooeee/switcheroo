/** Per-session composer text kept outside React, plus listeners for drafts seeded from outside. */
export const composerDraftStore = {
  drafts: new Map<string, string>(),
  seedListeners: new Set<(sessionId: string) => void>(),
};
