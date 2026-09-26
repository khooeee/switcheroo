import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from "react";
import { clampNotesWidth } from "./clampNotesWidth";
import { NotesMarkdownPreview } from "./NotesMarkdownPreview";
import "./tabNotes.css";

interface Props {
  tabId: string;
  value: string;
  width: number;
  onChange: (text: string) => void;
  onWidthChange: (width: number) => void;
}

export function TabNotes({ tabId, value, width, onChange, onWidthChange }: Props) {
  const [paneWidth, setPaneWidth] = useState(() => clampNotesWidth(width));
  const paneWidthRef = useRef(paneWidth);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drag.current) return;
    const next = clampNotesWidth(width);
    paneWidthRef.current = next;
    setPaneWidth(next);
  }, [tabId, width]);

  const apply = (next: number, persist = false) => {
    const clamped = clampNotesWidth(next);
    paneWidthRef.current = clamped;
    setPaneWidth(clamped);
    if (persist) onWidthChange(clamped);
  };

  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width: paneWidthRef.current };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const stop = () => {
    if (!drag.current) return;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onWidthChange(paneWidthRef.current);
    drag.current = null;
  };

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const preview = editorRef.current?.querySelector<HTMLElement>(".tab-notes-md");
    if (!preview) return;
    preview.scrollTop = event.currentTarget.scrollTop;
    preview.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <aside className="tab-notes" style={{ width: paneWidth }} aria-label="Tab notes">
      <div
        className="tab-notes-resize"
        role="separator"
        aria-label="Resize notes"
        aria-orientation="vertical"
        aria-valuemin={180}
        aria-valuenow={paneWidth}
        aria-valuemax={640}
        tabIndex={0}
        onPointerDown={start}
        onPointerMove={(event) => {
          if (!drag.current) return;
          apply(drag.current.width + drag.current.x - event.clientX);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          apply(paneWidth + (event.key === "ArrowLeft" ? 24 : -24), true);
        }}
      />
      <div className="tab-notes-editor" ref={editorRef}>
        <NotesMarkdownPreview text={value} />
        <textarea
          value={value}
          placeholder="Notes…"
          spellCheck
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncScroll}
        />
      </div>
    </aside>
  );
}
