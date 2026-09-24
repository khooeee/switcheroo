const MIN_WIDTH = 180;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 280;

export function clampNotesWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

export const defaultNotesWidth = DEFAULT_WIDTH;
