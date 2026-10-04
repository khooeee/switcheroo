import lightCss from "github-markdown-css/github-markdown-light.css?inline";
import darkCss from "github-markdown-css/github-markdown-dark.css?inline";

/** Scope Primer Markdown CSS so it does not collide with chat `.markdown-body`. */
export function githubMarkdownCss(theme: "light" | "dark"): string {
  const css = theme === "dark" ? darkCss : lightCss;
  return css.replaceAll(".markdown-body", ".github-markdown-preview");
}
