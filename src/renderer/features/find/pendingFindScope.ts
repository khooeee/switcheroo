/** Message element pending for context-menu Find (set on right-click, taken on Find). */
let pending: HTMLElement | null = null;

export function setPendingFindScope(el: HTMLElement | null): void {
  pending = el;
}

export function takePendingFindScope(): HTMLElement | null {
  const el = pending;
  pending = null;
  return el?.isConnected ? el : null;
}

export function clearPendingFindScope(): void {
  pending = null;
}
