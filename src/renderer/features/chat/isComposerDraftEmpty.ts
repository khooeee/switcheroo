import { composerDraftStore } from "./composerDraftStore";

/** True when the session has no sendable composer text (whitespace counts as empty). */
export function isComposerDraftEmpty(sessionId: string): boolean {
  return !(composerDraftStore.drafts.get(sessionId) ?? "").trim();
}
