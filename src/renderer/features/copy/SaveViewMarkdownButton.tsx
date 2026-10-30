import type { SaveMarkdownView } from "../../../shared/saveMarkdownView";
import { SAVE_MARKDOWN_VIEW_LABELS } from "../../../shared/saveMarkdownViewLabels";
import { SaveMarkdownButton } from "./SaveMarkdownButton";
import { useSaveViewMarkdownEvent } from "./useSaveViewMarkdownEvent";

/** Panel-header save button; also answers the panel's "Save … as Markdown" context-menu item. */
export function SaveViewMarkdownButton({
  view,
  getMarkdown,
  nameHint,
}: {
  view: SaveMarkdownView;
  /** Called only on save, so streaming panels can pass a fresh closure each render. */
  getMarkdown: () => string;
  nameHint: string;
}) {
  useSaveViewMarkdownEvent(view, getMarkdown, nameHint);
  return <SaveMarkdownButton text={getMarkdown} nameHint={nameHint} label={SAVE_MARKDOWN_VIEW_LABELS[view]} />;
}
