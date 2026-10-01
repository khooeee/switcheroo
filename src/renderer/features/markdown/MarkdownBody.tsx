import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown.css";

export const MarkdownBody = memo(function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="body markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
        a: ({ href, children }) => href && /^(https?:|mailto:)/i.test(href)
          ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          : <span>{children}</span>,
        img: ({ alt }) => <span>{alt}</span>,
        table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
      }}>{text}</ReactMarkdown>
    </div>
  );
});
