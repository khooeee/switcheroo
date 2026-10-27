/** First line of `text`, with an ellipsis when more lines follow. */
export function firstLine(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.indexOf("\n");
  return end === -1 ? trimmed : `${trimmed.slice(0, end).trimEnd()}…`;
}
