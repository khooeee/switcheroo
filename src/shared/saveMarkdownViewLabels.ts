import type { SaveMarkdownView } from "./saveMarkdownView";

/** Header button tooltip per panel; menus append an ellipsis. */
export const SAVE_MARKDOWN_VIEW_LABELS: Record<SaveMarkdownView, string> = {
  session: "Save Session as Markdown",
  switchboard: "Save Switchboard as Markdown",
  "turn-details": "Save Turn Details as Markdown",
  subagent: "Save Subagent as Markdown",
};
