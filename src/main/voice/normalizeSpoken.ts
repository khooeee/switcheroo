/** Words people say around a session or project name that never identify it. */
const FILLER = new Set(["the", "a", "an", "session", "sessions", "one", "agent", "tab", "chat", "project", "repo", "folder", "in", "on", "for"]);

/** Lowercase alphanumeric tokens with filler words removed, for fuzzy spoken matching. */
export function normalizeSpoken(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !FILLER.has(token));
}
