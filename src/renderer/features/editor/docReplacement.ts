import { EditorState, Text, type ChangeSpec } from "@codemirror/state";

/**
 * The smallest middle span that turns the editor's document into `text`, so cursors outside it
 * stay put. Works on "\n"-joined lines: document positions count each line break as one.
 */
export function docReplacement(state: EditorState, text: string): ChangeSpec {
  const separator = state.facet(EditorState.lineSeparator);
  const after = separator ? text.split(separator).join("\n") : text.replace(/\r\n?/g, "\n");
  const before = state.doc.toString();
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  let end = 0;
  while (
    end < max - start &&
    before.charCodeAt(before.length - 1 - end) === after.charCodeAt(after.length - 1 - end)
  ) end++;
  // A Text keeps the lines as split here instead of re-splitting on the state's separator.
  const insert = Text.of(after.slice(start, after.length - end).split("\n"));
  return { from: start, to: before.length - end, insert };
}
