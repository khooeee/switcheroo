/** Waiters for settled tab status used by the control API. */
export class TabWaiters {
  private settled = new Map<string, Array<(status: string, error: string | null) => void>>();

  notifySettled(tabId: string, status: string, error: string | null): void {
    if (status !== "ready" && status !== "error" && status !== "idle") return;
    const list = this.settled.get(tabId);
    if (!list?.length) return;
    this.settled.delete(tabId);
    for (const resolve of list) resolve(status, error);
  }

  waitSettled(
    tabId: string,
    timeoutMs: number,
    current: { status: string; error: string | null },
  ): Promise<{ tabId: string; status: string; error: string | null }> {
    if (current.status === "ready" || current.status === "error" || current.status === "idle") {
      return Promise.resolve({ tabId, status: current.status, error: current.error });
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.dropSettled(tabId, onSettle);
        reject(new Error(`Timed out waiting for tab settled (${timeoutMs}ms)`));
      }, timeoutMs);
      const onSettle = (status: string, error: string | null) => {
        clearTimeout(timer);
        resolve({ tabId, status, error });
      };
      const list = this.settled.get(tabId) ?? [];
      list.push(onSettle);
      this.settled.set(tabId, list);
    });
  }

  private dropSettled(
    tabId: string,
    resolve: (status: string, error: string | null) => void,
  ): void {
    const list = this.settled.get(tabId);
    if (!list) return;
    const next = list.filter((item) => item !== resolve);
    if (next.length) this.settled.set(tabId, next);
    else this.settled.delete(tabId);
  }
}
