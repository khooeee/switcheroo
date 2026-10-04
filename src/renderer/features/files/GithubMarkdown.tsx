import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { githubMarkdownCss } from "./githubMarkdownCss";

/** Renders Markdown with GitHub Primer styles (blob Preview tab). */
export function GithubMarkdown({ text, theme }: { text: string; theme: "light" | "dark" }) {
  return (
    <>
      <style>{githubMarkdownCss(theme)}</style>
      <article className="github-markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ href, children }) =>
              href && /^(https?:|mailto:)/i.test(href) ? (
                <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
              ) : (
                <span>{children}</span>
              ),
            img: ({ src, alt }) =>
              src && /^https?:/i.test(src) ? (
                <img src={src} alt={alt || ""} />
              ) : (
                <span>{alt}</span>
              ),
          }}
        >
          {text}
        </ReactMarkdown>
      </article>
    </>
  );
}
