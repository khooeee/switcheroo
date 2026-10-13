import { useCallback } from "react";
import type { CursorAskQuestionRequest } from "../../../shared/agentRequests";
import type { AskQuestionOutcome } from "../permissions/AskQuestionBar";

/** Stable send / interrupt / answer handlers for the chat panel showing `sessionId`. */
export function useChatActions(
  sessionId: string | null,
  askQuestion: CursorAskQuestionRequest | null,
  beforeSend: () => void,
) {
  const send = useCallback(async (text: string) => {
    if (!sessionId) return;
    beforeSend();
    await window.switcheroo.sendPrompt(sessionId, text);
  }, [sessionId, beforeSend]);

  const interrupt = useCallback(() => {
    if (!sessionId) return;
    void window.switcheroo.cancelPrompt(sessionId).catch(console.error);
  }, [sessionId]);

  const answer = useCallback((outcome: AskQuestionOutcome) => {
    if (!askQuestion) return;
    void window.switcheroo.respondAskQuestion(askQuestion.requestId, outcome).catch(console.error);
  }, [askQuestion]);

  return { send, interrupt, answer };
}
