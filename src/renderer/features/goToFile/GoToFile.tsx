import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { revealPath } from "../explorer/revealPath";
import { useExplorerState } from "../explorer/useExplorerState";
import { GoToFileRow } from "./GoToFileRow";
import { toPathEntry } from "./toPathEntry";
import { rankEntries } from "./rankEntries";
import type { RankedEntry } from "./RankedEntry";
import { usePathEntries } from "./usePathEntries";
import "./goToFile.css";

const NO_POSITIONS: readonly number[] = [];

/**
 * Cmd+P in File Explorer mode: fuzzy-search the session's files and folders. Enter opens the file
 * in a tab, or expands the folder in the tree. With nothing typed it lists the open tabs.
 */
export function GoToFile({ sessionId }: { sessionId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const { entries, error, loading } = usePathEntries(sessionId, open);
  const { openFiles, activeFile } = useExplorerState(sessionId);
  // Ranking a big project is the slow part; typing stays ahead of it.
  const deferredQuery = useDeferredValue(query);

  // The current tab goes last, so Cmd+P then Enter switches to another one.
  const tabs = useMemo<RankedEntry[]>(() => {
    const paths = [...openFiles.filter((path) => path !== activeFile), ...(activeFile ? [activeFile] : [])];
    return paths.map((path) => ({ entry: toPathEntry(path, "file"), positions: NO_POSITIONS }));
  }, [openFiles, activeFile]);
  const results = useMemo(
    () => (deferredQuery.trim() ? rankEntries(entries, deferredQuery) : tabs),
    [entries, deferredQuery, tabs],
  );
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const index = Math.min(selected, results.length - 1);

  const pick = useCallback((hit: RankedEntry | undefined) => {
    if (!hit) return;
    dialogRef.current?.close();
    revealPath(sessionId, hit.entry.path, hit.entry.kind);
  }, [sessionId]);
  const onPick = useCallback((at: number) => pick(resultsRef.current[at]), [pick]);

  const move = useCallback((delta: number) => {
    const count = resultsRef.current.length;
    if (count > 0) setSelected((prev) => (Math.min(prev, count - 1) + delta + count) % count);
  }, []);

  // Cmd+P opens the picker; pressed again it steps down the list (see useFileShortcuts).
  useEffect(() => {
    const onGoToFile = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (dialog.open) {
        move(1);
        return;
      }
      dialog.showModal();
      setOpen(true);
    };
    window.addEventListener("switcheroo:go-to-file", onGoToFile);
    return () => window.removeEventListener("switcheroo:go-to-file", onGoToFile);
  }, [move]);

  useEffect(() => {
    listRef.current?.querySelector("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
  }, [index, results]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    // The list can trail fast typing; Enter then takes the best match for what is in the box.
    if (deferredQuery === query) pick(results[index]);
    else pick(query.trim() ? rankEntries(entries, query)[0] : tabs[0]);
  };

  const onClose = () => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  };

  let empty = "Type to search files and folders.";
  if (error) empty = error;
  else if (loading && entries.length === 0) empty = "Loading files…";
  else if (deferredQuery.trim()) empty = "No matching files or folders.";

  return (
    <dialog
      ref={dialogRef}
      className="go-to-file"
      aria-label="Go to File"
      onClose={onClose}
      // A press outside the box lands on the dialog itself (its backdrop).
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <input
        value={query}
        spellCheck={false}
        placeholder="Search files and folders by name"
        aria-label="Search files and folders"
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(0);
        }}
        onKeyDown={onKeyDown}
      />
      <div ref={listRef} className="go-to-file-results" role="listbox" aria-label="Files and folders">
        {results.map((hit, at) => (
          <GoToFileRow
            key={hit.entry.path}
            index={at}
            entry={hit.entry}
            positions={hit.positions}
            selected={at === index}
            onPick={onPick}
          />
        ))}
        {results.length === 0 ? <div className="go-to-file-empty">{empty}</div> : null}
      </div>
    </dialog>
  );
}
