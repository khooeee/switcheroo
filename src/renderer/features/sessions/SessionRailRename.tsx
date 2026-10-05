import { useEffect, useRef, useState } from "react";

export function SessionRailRename({
  title,
  child = false,
  onSave,
  onCancel,
}: {
  title: string;
  /** Match indented child tab geometry. */
  child?: boolean;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <div
      className={`rail-session rail-renaming${child ? " rail-child" : ""}`}
    >
      {!child ? <span className="rail-chevron-spacer" aria-hidden="true" /> : null}
      <textarea
        ref={inputRef}
        className="rail-rename-input"
        value={value}
        rows={1}
        aria-label="Session title"
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          const el = e.target;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onBlur={onCancel}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const next = value.trim();
            if (next) onSave(next);
            else onCancel();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}
