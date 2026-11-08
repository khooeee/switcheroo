import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { modKey } from "../shortcuts/modKey";
import { FindOptionToggles } from "./FindOptionToggles";
import { findOptions } from "./findOptions";
import { findOptionShortcut } from "./findOptionShortcut";
import { useFindMatches } from "./useFindMatches";
import "./findBar.css";
import "./findHighlights.css";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  rootRefs: Array<RefObject<HTMLElement | null>>;
  /** Changes when an optional root (e.g. right rail) mounts or unmounts. */
  rootsKey?: string | number;
  /** Where find is searching. */
  scope?: "session" | "message" | "turn-details" | "voice-log";
  onClose: () => void;
}

const SCOPE_COPY = {
  session: { label: "Find in current session", placeholder: "Find in session…" },
  message: { label: "Find in message", placeholder: "Find in message…" },
  "turn-details": { label: "Find in turn details", placeholder: "Find in turn details…" },
  "voice-log": { label: "Find in voice log", placeholder: "Find in voice log…" },
} as const;

export function FindBar({
  query,
  onQuery,
  rootRefs,
  rootsKey = 0,
  scope = "session",
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useSyncExternalStore(findOptions.subscribe, findOptions.getSnapshot);
  const { count, index, go } = useFindMatches(rootRefs, query, options, rootsKey);
  const { label, placeholder } = SCOPE_COPY[scope];

  useEffect(() => {
    const previousFocus = document.activeElement;
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    const onKey = (event: KeyboardEvent) => {
      if (modKey(event, "f")) {
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
    <div className="find-bar" role="search" aria-label={label}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        const option = findOptionShortcut(event.nativeEvent);
        if (option) {
          event.preventDefault();
          findOptions.toggle(option);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}>
      <input
        ref={inputRef}
        value={query}
        aria-label={label}
        placeholder={placeholder}
        spellCheck={false}
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
      <FindOptionToggles options={options} />
      <button type="button" className="btn" aria-label="Previous match" data-tooltip="Previous match (Shift+Enter)" disabled={!count} onClick={() => go(-1)}>↑</button>
      <button type="button" className="btn" aria-label="Next match" data-tooltip="Next match (Enter)" disabled={!count} onClick={() => go(1)}>↓</button>
      <button type="button" className="btn" aria-label="Close find" data-tooltip="Close (Escape)" onClick={onClose}>✕</button>
    </div>
  );
}
