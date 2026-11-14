import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/** Token colors from `--syntax-*` theme variables, so one style serves light and dark. */
export const editorHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "var(--syntax-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--syntax-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--syntax-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--syntax-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--syntax-function)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--syntax-type)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--syntax-property)" },
  { tag: [t.tagName, t.definition(t.variableName)], color: "var(--syntax-tag)" },
  { tag: [t.meta, t.processingInstruction, t.annotation], color: "var(--syntax-meta)" },
  { tag: t.heading, color: "var(--syntax-keyword)", fontWeight: "600" },
  { tag: [t.link, t.url], color: "var(--syntax-string)", textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "600" },
  { tag: t.invalid, color: "var(--danger)" },
]);
