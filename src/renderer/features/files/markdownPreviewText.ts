import type { FileChange } from "../../../shared/fileChange";
import { isMarkdownFile } from "./isMarkdownFile";

/** Prefer the edited contents; fall back to prior text (e.g. deletes). */
export function markdownPreviewText(change: FileChange): string | null {
  if (!isMarkdownFile(change.path)) return null;
  if (typeof change.newText === "string") return change.newText;
  if (typeof change.oldText === "string") return change.oldText;
  return null;
}
