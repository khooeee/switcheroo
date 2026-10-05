import { composerDraftStore } from "./composerDraftStore";

/** Set a session's composer text from outside the composer (e.g. fork on a user message). */
export function seedComposerDraft(sessionId: string, text: string): void {
  composerDraftStore.drafts.set(sessionId, text);
  for (const listener of composerDraftStore.seedListeners) listener(sessionId);
}
