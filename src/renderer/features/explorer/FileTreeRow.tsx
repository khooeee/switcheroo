import { memo, type CSSProperties } from "react";
import { ChevronIcon } from "./ChevronIcon";
import type { TreeRow } from "./TreeRow";

type Props = TreeRow & {
  selected: boolean;
  onClick: (path: string, kind: TreeRow["kind"]) => void;
  onDoubleClick: (path: string, kind: TreeRow["kind"]) => void;
};

/** One file or folder line; folders show a chevron, and a read error tints the name. */
export const FileTreeRow = memo(function FileTreeRow({
  path,
  name,
  kind,
  depth,
  expanded,
  error,
  selected,
  onClick,
  onDoubleClick,
}: Props) {
  return (
    <div
      role="treeitem"
      className={`explorer-row${selected ? " selected" : ""}${error ? " error" : ""}`}
      style={{ "--depth": depth } as CSSProperties}
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={kind === "dir" ? expanded : undefined}
      data-path={path}
      title={error ?? path}
      onClick={() => onClick(path, kind)}
      onDoubleClick={() => onDoubleClick(path, kind)}
    >
      <span className="explorer-chevron">{kind === "dir" ? <ChevronIcon /> : null}</span>
      <span className="explorer-name">{name}</span>
    </div>
  );
});
