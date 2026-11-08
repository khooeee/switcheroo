import { normalizeSpoken } from "./normalizeSpoken";

/** One token matches another exactly, or by prefix once it's long enough to mean something. */
function tokenMatches(spoken: string, candidate: string): boolean {
  if (spoken === candidate) return true;
  if (spoken.length < 3 || candidate.length < 3) return false;
  return candidate.startsWith(spoken) || spoken.startsWith(candidate);
}

/**
 * 0–100 for how well a spoken reference names a candidate: 100 for an exact `primary` match,
 * 80 when it appears verbatim, else the share of spoken tokens found (scaled to 60).
 */
export function spokenMatchScore(spoken: string, primary: string, extra = ""): number {
  const want = normalizeSpoken(spoken);
  if (!want.length) return 0;
  const head = normalizeSpoken(primary);
  const hay = [...head, ...normalizeSpoken(extra)];
  if (head.join(" ") === want.join(" ")) return 100;
  if (` ${hay.join(" ")} `.includes(` ${want.join(" ")} `)) return 80;
  const found = want.filter((token) => hay.some((candidate) => tokenMatches(token, candidate))).length;
  return Math.round((60 * found) / want.length);
}
