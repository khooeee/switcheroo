import { memo } from "react";
import { highlightMatches } from "./highlightMatches";
import type { PathEntry } from "./PathEntry";

interface Props {
  index: number;
  entry: PathEntry;
  positions: readonly number[];
  selected: boolean;
  onPick: (index: number) => void;
}

/** One result: the name, then the folder holding it; folders end in "/". */
export const GoToFileRow = memo(function GoToFileRow({ index, entry, positions, selected, onPick }: Props) {
  const { path, kind, nameStart } = entry;
  return (
    <div
      role="option"
      className="go-to-file-row"
      aria-selected={selected}
      title={path}
      // Keep focus in the search box.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(index)}
    >
      <span className="go-to-file-name">
        {highlightMatches(path.slice(nameStart), nameStart, positions)}
        {kind === "dir" ? "/" : null}
      </span>
      <span className="go-to-file-dir">{highlightMatches(path.slice(0, Math.max(0, nameStart - 1)), 0, positions)}</span>
    </div>
  );
});
