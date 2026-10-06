import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";
import "./markdown.css";

// Module-level so streaming re-renders do not remount links, images, tables, or code blocks.
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const COMPONENTS: Components = {
  a: ({ href, children }) => href && /^(https?:|mailto:)/i.test(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>,
  img: ({ alt }) => <span>{alt}</span>,
  table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
  pre: MarkdownCodeBlock,
};

export const MarkdownBody = memo(function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="body markdown-body">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} skipHtml components={COMPONENTS}>{text}</ReactMarkdown>
    </div>
  );
});
