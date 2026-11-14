import { EditorView } from "@codemirror/view";

/** Editor chrome in the app's theme variables (follows light/dark without reconfiguring). */
export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--bg-1)",
    color: "var(--text)",
    fontSize: "var(--font-mono-size)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.5" },
  ".cm-content": { caretColor: "var(--text)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--editor-selection)",
  },
  ".cm-activeLine": { backgroundColor: "var(--editor-active-line)" },
  ".cm-selectionMatch": { backgroundColor: "var(--editor-selection-match)" },
  ".cm-searchMatch": { backgroundColor: "var(--mark)" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--accent-2)", color: "var(--bg-0)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-1)",
    color: "color-mix(in srgb, var(--text-dim) 60%, transparent)",
    border: "none",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--bg-3)", border: "none", color: "var(--text-dim)" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--editor-selection-match)",
    outline: "1px solid var(--border)",
  },
  ".cm-panels": { backgroundColor: "var(--bg-2)", color: "var(--text)" },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--border)" },
  ".cm-panel input, .cm-panel button": { fontFamily: "var(--font-ui)", fontSize: "var(--font-ui-size)" },
  ".cm-textfield": {
    backgroundColor: "var(--bg-1)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
  },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "var(--bg-3)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
  },
  ".cm-tooltip": { backgroundColor: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--bg-selected-tab)", color: "var(--text)" },
});
