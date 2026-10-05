export function matchSnippet(text: string, needleLower: string, radius = 48): string {
  const idx = text.toLowerCase().indexOf(needleLower);
  if (idx < 0) {
    const clipped = text.slice(0, radius * 2).replace(/\s+/g, " ").trim();
    return text.length > radius * 2 ? `${clipped}…` : clipped;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needleLower.length + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}
