import { notesMarkdownBandLines } from "./notesMarkdownBandLines";
import { notesMarkdownSegments, type NotesMdKind } from "./notesMarkdownSegments";

const bandKinds = new Set<NotesMdKind>(["codeBlock", "blockquote"]);

export function NotesMarkdownPreview({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="tab-notes-md" aria-hidden>
      {notesMarkdownSegments(text).flatMap((segment, index) => {
        if (!bandKinds.has(segment.kind)) {
          return [
            <span key={index} className={segment.kind === "text" ? undefined : `tab-notes-md-${segment.kind}`}>
              {segment.text}
            </span>,
          ];
        }
        return notesMarkdownBandLines(segment.text).map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`} className={`tab-notes-md-${segment.kind}`}>
            {line.length > 0 ? line : "\u200b"}
          </span>
        ));
      })}
      {text.endsWith("\n") ? "\n" : null}
    </div>
  );
}
