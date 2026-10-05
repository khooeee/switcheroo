/** True when the path looks like a Markdown file GitHub would Preview. */
export function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown|mdown|mkd|mdwn)$/i.test(path);
}
