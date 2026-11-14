import type { EditorState, Text } from "@codemirror/state";

/**
 * The editor's live state. The open editor writes `state` on every change without a re-render;
 * the store replaces `state` on reload. `saved` is the document as last read or written.
 */
export interface LiveText {
  state: EditorState;
  saved: Text;
}

/** One open file: editable text, an image, or why it cannot be shown. */
export type FileBuffer =
  | { kind: "loading" }
  | {
      kind: "text";
      live: LiveText;
      /** Disk mtime the text was loaded or saved at; a save refuses if the file moved on. */
      mtimeMs: number;
      dirty: boolean;
      /**
       * Disk mtime when the file changed under unsaved edits (or a save hit that); null when in step.
       * Keep Mine adopts it, so the next save overwrites that version but not a later one.
       */
      conflictMtimeMs: number | null;
    }
  | { kind: "image"; dataUrl: string }
  | { kind: "binary" | "tooLarge"; size: number }
  | { kind: "missing" }
  | { kind: "error"; message: string };
