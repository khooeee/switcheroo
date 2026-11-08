import type { CursorAskQuestionRequest } from "../../shared/agentRequests";

/** Main-process listener for session events (the voice agent announces them). */
export interface SessionObserver {
  /** A prompt finished; return true when it will be announced so the renderer skips its sound. */
  promptComplete(sessionId: string): boolean;
  askQuestion(request: CursorAskQuestionRequest): void;
  questionSettled(requestId: string): void;
  /** The session newly entered the error state. */
  sessionError(sessionId: string, error: string): void;
}
