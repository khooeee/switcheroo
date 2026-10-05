import { randomUUID } from "node:crypto";
import type { CursorAskQuestionRequest } from "../../shared/types";

type Outcome = Record<string, unknown>;

const CANCELLED: Outcome = { outcome: "cancelled" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class PendingQuestions {
  private pending = new Map<string, (outcome: Outcome) => void>();

  constructor(
    private sessionId: string,
    private publish: (request: CursorAskQuestionRequest) => void,
    private settled: (requestId: string) => void,
  ) {}

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  request(raw: unknown, signal?: AbortSignal): Promise<Outcome> {
    if (signal?.aborted) return Promise.resolve(CANCELLED);
    const params = isRecord(raw) ? raw : {};
    const requestId = randomUUID();
    return new Promise((resolve) => {
      const cancel = () => this.respond(requestId, CANCELLED);
      this.pending.set(requestId, (outcome) => {
        signal?.removeEventListener("abort", cancel);
        this.settled(requestId);
        resolve(outcome);
      });
      signal?.addEventListener("abort", cancel, { once: true });
      this.publish({
        requestId, sessionId: this.sessionId,
        toolCallId: String(params.toolCallId ?? ""),
        title: params.title as string | undefined,
        questions: (params.questions as CursorAskQuestionRequest["questions"]) ?? [],
      });
    });
  }

  /** `outcome` arrives over IPC; anything that is not an object is treated as a cancel. */
  respond(requestId: string, outcome: unknown): void {
    const resolve = this.pending.get(requestId);
    this.pending.delete(requestId);
    resolve?.(isRecord(outcome) ? outcome : CANCELLED);
  }

  cancel(): void {
    for (const requestId of this.pending.keys()) this.respond(requestId, CANCELLED);
  }
}
