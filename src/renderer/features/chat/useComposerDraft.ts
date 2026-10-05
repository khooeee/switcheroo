import { useEffect, useState } from "react";
import { composerDraftStore } from "./composerDraftStore";

const { drafts, seedListeners } = composerDraftStore;

/** Per-session composer text that does not lift into App (avoids transcript re-renders while typing). */
export function useComposerDraft(sessionId: string): [string, (text: string) => void] {
  const [draft, setDraft] = useState(() => drafts.get(sessionId) ?? "");

  useEffect(() => {
    setDraft(drafts.get(sessionId) ?? "");
    const onSeed = (id: string) => {
      if (id === sessionId) setDraft(drafts.get(id) ?? "");
    };
    seedListeners.add(onSeed);
    return () => {
      seedListeners.delete(onSeed);
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
