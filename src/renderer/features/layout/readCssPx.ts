/** Parse a CSS custom property pixel value from `:root` (0 if missing/invalid). */
export function readCssPx(varName: string): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}
