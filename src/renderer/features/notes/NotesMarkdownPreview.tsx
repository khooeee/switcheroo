import { notesMarkdownSegments } from "./notesMarkdownSegments";

export function NotesMarkdownPreview({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="tab-notes-md" aria-hidden>
      {notesMarkdownSegments(text).map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <span key={index} className={`tab-notes-md-${segment.kind}`}>
            {segment.text}
          </span>
        ),
      )}
      {text.endsWith("\n") ? "\n" : null}
    </div>
  );
}
