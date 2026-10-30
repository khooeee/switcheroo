import type { SaveMarkdownView } from "./saveMarkdownView";

/** What the transcript edit context menu offers beyond Copy, read from the DOM under the cursor. */
export interface EditContextMenuOptions {
  link?: string;
  code?: string;
  /** Message markdown for Copy Message / Save Message as Markdown. */
  markdown?: string;
  canCopy?: boolean;
  canFind?: boolean;
  turnDetails?: { turnId: string; eventId: string };
  /** Panel under the cursor that can be saved whole as markdown. */
  saveView?: SaveMarkdownView;
}
