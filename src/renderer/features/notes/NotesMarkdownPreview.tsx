import { notesMarkdownBandLines } from "./notesMarkdownBandLines";
import { notesMarkdownSegments, type NotesMdKind } from "./notesMarkdownSegments";

const bandKinds = new Set<NotesMdKind>(["codeBlock", "blockquote"]);

export function NotesMarkdownPreview({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="session-notes-md" aria-hidden>
      {notesMarkdownSegments(text).flatMap((segment, index) => {
        if (!bandKinds.has(segment.kind)) {
          return [
            <span key={index} className={segment.kind === "text" ? undefined : `session-notes-md-${segment.kind}`}>
              {segment.text}
            </span>,
          ];
        }
        return notesMarkdownBandLines(segment.text).map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`} className={`session-notes-md-${segment.kind}`}>
            {line.length > 0 ? line : "\u200b"}
          </span>
        ));
      })}
      {text.endsWith("\n") ? "\n" : null}
    </div>
  );
}
