/** Waiters for settled tab status used by the control API. */
export class SessionWaiters {
  private settled = new Map<string, Array<(status: string, error: string | null) => void>>();

  notifySettled(sessionId: string, status: string, error: string | null): void {
    if (status !== "ready" && status !== "error" && status !== "idle") return;
    const list = this.settled.get(sessionId);
    if (!list?.length) return;
    this.settled.delete(sessionId);
    for (const resolve of list) resolve(status, error);
  }

  waitSettled(
    sessionId: string,
    timeoutMs: number,
    current: { status: string; error: string | null },
  ): Promise<{ sessionId: string; status: string; error: string | null }> {
    if (current.status === "ready" || current.status === "error" || current.status === "idle") {
      return Promise.resolve({ sessionId, status: current.status, error: current.error });
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.dropSettled(sessionId, onSettle);
        reject(new Error(`Timed out waiting for tab settled (${timeoutMs}ms)`));
      }, timeoutMs);
      const onSettle = (status: string, error: string | null) => {
        clearTimeout(timer);
        resolve({ sessionId, status, error });
      };
      const list = this.settled.get(sessionId) ?? [];
      list.push(onSettle);
      this.settled.set(sessionId, list);
    });
  }

  private dropSettled(
    sessionId: string,
    resolve: (status: string, error: string | null) => void,
  ): void {
    const list = this.settled.get(sessionId);
    if (!list) return;
    const next = list.filter((item) => item !== resolve);
    if (next.length) this.settled.set(sessionId, next);
    else this.settled.delete(sessionId);
  }
}
