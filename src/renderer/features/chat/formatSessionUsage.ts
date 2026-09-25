import type { SessionUsage } from "../../../shared/types";

/** Composer footer label (`0.0%`) and hover detail (`0k/272k`). */
export function formatSessionUsage(usage: SessionUsage): { percent: string; detail: string } {
  const ratio = usage.size > 0 ? (usage.used / usage.size) * 100 : 0;
  return {
    percent: `${ratio.toFixed(1)}%`,
    detail: `${formatTokens(usage.used)}/${formatTokens(usage.size)}`,
  };
}

function formatTokens(n: number): string {
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)}k`;
}
