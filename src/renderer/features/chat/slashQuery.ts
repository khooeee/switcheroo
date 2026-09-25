/** Returns the typed slash prefix (without `/`) when the draft is a single slash token. */
export function slashQuery(draft: string): string | null {
  const match = /^\/([^\s]*)$/.exec(draft);
  return match ? match[1] : null;
}
