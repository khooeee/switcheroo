import { randomUUID } from "node:crypto";
import type { CursorAskQuestionRequest } from "../../shared/types";

export class PendingQuestions {
  private pending = new Map<string, (outcome: unknown) => void>();

  constructor(
    private sessionId: string,
    private publish: (request: CursorAskQuestionRequest) => void,
    private settled: (requestId: string) => void,
  ) {}

  request(params: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) return Promise.resolve({ outcome: "cancelled" });
    const requestId = randomUUID();
    return new Promise((resolve) => {
      const cancel = () => this.respond(requestId, { outcome: "cancelled" });
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

  respond(requestId: string, outcome: unknown): void {
    const resolve = this.pending.get(requestId);
    this.pending.delete(requestId);
    resolve?.(outcome);
  }

  cancel(): void {
    for (const requestId of this.pending.keys()) this.respond(requestId, { outcome: "cancelled" });
  }
}
