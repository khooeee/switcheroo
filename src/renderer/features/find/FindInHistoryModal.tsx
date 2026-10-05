import { useEffect, useRef } from "react";
import type { FindInSessionsHit } from "../../../shared/findInSessionsHit";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { FindInHistoryResults } from "./FindInHistoryResults";
import { useFindInHistorySearch } from "./useFindInHistorySearch";
import "../modals/modal.css";
import "./findInHistory.css";

interface Props {
  open: boolean;
  onCancel: () => void;
  onSelect: (hit: FindInSessionsHit) => void;
}

export function FindInHistoryModal({ open, onCancel, onSelect }: Props) {
  const search = useFindInHistorySearch(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>("[data-selected='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [open, search.selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (search.searching) {
          search.stopSearch();
          return;
        }
        onCancel();
        return;
      }
      const root = dialogRef.current;
      if (root) trapModalTabFocus(event, root);
      if (event.key === "ArrowDown" && !search.searching && search.queryMatchesSearch && search.visibleHits.length) {
        event.preventDefault();
        search.setSelected((index) => Math.min(search.visibleHits.length - 1, index + 1));
        return;
      }
      if (event.key === "ArrowUp" && !search.searching && search.queryMatchesSearch && search.visibleHits.length) {
        event.preventDefault();
        search.setSelected((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        if (!search.searching && search.queryMatchesSearch && search.visibleHits[search.selected]) {
          onSelect(search.visibleHits[search.selected]);
          return;
        }
        search.runSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal find-sessions-modal"
        role="dialog"
        aria-label="Find in History"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={search.query}
          spellCheck={false}
          placeholder="Search entire session history…"
          aria-label="Find in history"
          onChange={(event) => search.setQuery(event.target.value)}
        />
        <div ref={listRef} className="find-sessions-results" role="listbox" aria-label="Search results">
          <FindInHistoryResults search={search} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
