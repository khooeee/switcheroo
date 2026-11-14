import { indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { editorHighlightStyle } from "./editorHighlightStyle";
import { editorTheme } from "./editorTheme";

/** Everything one file's editor state carries: basic setup, its language, theme, and Cmd+S. */
export function editorExtensions(language: Extension, crlf: boolean, onSave: () => void): Extension[] {
  return [
    basicSetup,
    keymap.of([indentWithTab]),
    Prec.high(keymap.of([{ key: "Mod-s", preventDefault: true, run: () => (onSave(), true) }])),
    language,
    editorTheme,
    syntaxHighlighting(editorHighlightStyle),
    // Saves join lines with this, so Windows line endings survive an edit.
    crlf ? EditorState.lineSeparator.of("\r\n") : [],
  ];
}
