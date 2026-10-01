import { useEffect, useState } from "react";

const drafts = new Map<string, string>();

/** True when the session has no sendable composer text (whitespace counts as empty). */
export function isComposerDraftEmpty(sessionId: string): boolean {
  return !(drafts.get(sessionId) ?? "").trim();
}

/** Per-session composer text that does not lift into App (avoids transcript re-renders while typing). */
export function useComposerDraft(sessionId: string): [string, (text: string) => void] {
  const [draft, setDraft] = useState(() => drafts.get(sessionId) ?? "");

  useEffect(() => {
    setDraft(drafts.get(sessionId) ?? "");
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
