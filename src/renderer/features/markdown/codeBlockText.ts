/** Code text of a rendered `.markdown-code-block` (no fences, no trailing newline). */
export function codeBlockText(block: Element | null): string {
  return (block?.querySelector("pre")?.textContent ?? "").replace(/\n$/, "");
}
