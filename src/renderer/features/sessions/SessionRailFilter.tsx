import { useRef } from "react";
import "./sessionRailFilter.css";

/** Filter field for the session rail list (title / cwd). */
export function SessionRailFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rail-filter">
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Filter sessions"
        aria-label="Filter sessions"
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="rail-filter-clear"
          aria-label="Clear filter"
          data-tooltip="Clear"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
