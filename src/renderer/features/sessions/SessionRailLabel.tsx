import "./sessionRailLabel.css";

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

type Part = { type: "text" | "url"; value: string };

function splitUrls(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0].replace(/[.,;:!?)\]]+$/u, "");
    if (!url) continue;
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    parts.push({ type: "url", value: url });
    last = index + url.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}

/** Session rail title with http(s) URLs opened in the browser. */
export function SessionRailLabel({ title }: { title: string }) {
  return (
    <span className="rail-label">
      {splitUrls(title).map((part, index) =>
        part.type === "url" ? (
          <a
            key={index}
            className="rail-label-link"
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </span>
  );
}
