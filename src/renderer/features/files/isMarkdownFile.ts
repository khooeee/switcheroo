import type { FileChange } from "../../../shared/types";

/** True when the path looks like a Markdown file GitHub would Preview. */
export function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown|mdown|mkd|mdwn)$/i.test(path);
}

/** Prefer the edited contents; fall back to prior text (e.g. deletes). */
export function markdownPreviewText(change: FileChange): string | null {
  if (!isMarkdownFile(change.path)) return null;
  if (typeof change.newText === "string") return change.newText;
  if (typeof change.oldText === "string") return change.oldText;
  return null;
}
