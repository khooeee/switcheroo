import { useEffect, useState } from "react";
import type { CursorAskQuestionRequest } from "../../../shared/types";

export function useAgentQuestions(tabId: string): CursorAskQuestionRequest | null {
  const [questions, setQuestions] = useState<CursorAskQuestionRequest[]>([]);
  useEffect(() => {
    const unsubscribe = window.switcheroo.onAskQuestion((request) => {
      setQuestions((previous) => [...previous, request]);
    });
    const unsubscribeSettled = window.switcheroo.onQuestionSettled(({ requestId }) => {
      setQuestions((previous) => previous.filter((request) => request.requestId !== requestId));
    });
    return () => { unsubscribe(); unsubscribeSettled(); };
  }, []);
  return questions.find((request) => request.tabId === tabId) ?? null;
}
