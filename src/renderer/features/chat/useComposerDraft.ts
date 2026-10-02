import { useEffect, useState } from "react";

const drafts = new Map<string, string>();
const seeded = new Set<(sessionId: string) => void>();

/** True when the session has no sendable composer text (whitespace counts as empty). */
export function isComposerDraftEmpty(sessionId: string): boolean {
  return !(drafts.get(sessionId) ?? "").trim();
}

/** Set a session's composer text from outside the composer (e.g. fork on a user message). */
export function seedComposerDraft(sessionId: string, text: string): void {
  drafts.set(sessionId, text);
  for (const listener of seeded) listener(sessionId);
}

/** Per-session composer text that does not lift into App (avoids transcript re-renders while typing). */
export function useComposerDraft(sessionId: string): [string, (text: string) => void] {
  const [draft, setDraft] = useState(() => drafts.get(sessionId) ?? "");

  useEffect(() => {
    setDraft(drafts.get(sessionId) ?? "");
    const onSeed = (id: string) => {
      if (id === sessionId) setDraft(drafts.get(id) ?? "");
    };
    seeded.add(onSeed);
    return () => {
      seeded.delete(onSeed);
    };
  }, [sessionId]);

  return [
    draft,
    (text: string) => {
      if (text) drafts.set(sessionId, text);
      else drafts.delete(sessionId);
      setDraft(text);
    },
  ];
}
