import { createHash, timingSafeEqual } from "node:crypto";

/** Hashing first gives equal-length buffers, so the comparison time reveals neither length nor content. */
function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function bearerAuthorized(header: string | undefined, token: string): boolean {
  if (!header || !token) return false;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return !!match && sameSecret(match[1]!, token);
}
