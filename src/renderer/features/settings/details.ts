const STORAGE_KEY = "switcheroo.details";

export function readDetailsVisible(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

export function applyDetailsVisible(visible: boolean): void {
  document.documentElement.dataset.details = visible ? "shown" : "hidden";
}

export function applyStoredDetails(): boolean {
  const visible = readDetailsVisible();
  applyDetailsVisible(visible);
  return visible;
}

export function toggleDetailsVisible(): boolean {
  const next = !readDetailsVisible();
  try {
    localStorage.setItem(STORAGE_KEY, next ? "shown" : "hidden");
  } catch {
    // The choice still applies for this session if storage is unavailable.
  }
  applyDetailsVisible(next);
  return next;
}
