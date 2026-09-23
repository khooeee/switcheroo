const STORAGE_KEY = "switcheroo.composerHeight";
const DEFAULT_HEIGHT = 72;

function normalize(value: number): number {
  return Number.isFinite(value) ? Math.max(DEFAULT_HEIGHT, Math.round(value)) : DEFAULT_HEIGHT;
}

export const composerHeight = {
  read(): number {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? DEFAULT_HEIGHT : normalize(Number(saved));
    } catch {
      return DEFAULT_HEIGHT;
    }
  },

  apply(height: number, persist = false): number {
    const next = normalize(height);
    document.documentElement.style.setProperty("--composer-input-height", `${next}px`);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Keep resizing available when storage is unavailable.
      }
    }
    return next;
  },
};
