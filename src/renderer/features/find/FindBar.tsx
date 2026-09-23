import { useEffect, useRef, type RefObject } from "react";
import { useFindMatches } from "./useFindMatches";
import "./findHighlights.css";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  rootRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function FindBar({ query, onQuery, rootRef, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { count, index, go } = useFindMatches(rootRef, query);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        focus();
      }
    };
    focus();
    window.addEventListener("switcheroo:find", focus);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("switcheroo:find", focus);
      window.removeEventListener("keydown", onKey);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="find-bar" role="search" aria-label="Find in current tab"
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}>
      <input
        ref={inputRef}
        value={query}
        aria-label="Find in current tab"
        placeholder="Find in tab…"
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            go(event.shiftKey ? -1 : 1);
          }
        }}
      />
      <span className="find-count" role="status" aria-live="polite">
        {query ? count ? `${index + 1} of ${count}` : "0 results" : ""}
      </span>
      <button type="button" className="btn" aria-label="Previous match" title="Previous match (Shift+Enter)" disabled={!count} onClick={() => go(-1)}>↑</button>
      <button type="button" className="btn" aria-label="Next match" title="Next match (Enter)" disabled={!count} onClick={() => go(1)}>↓</button>
      <button type="button" className="btn" aria-label="Close find" title="Close (Escape)" onClick={onClose}>✕</button>
    </div>
  );
}
