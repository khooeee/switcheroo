import { parentPath } from "./parentPath";
import type { TreeRow } from "./TreeRow";

export type TreeKeyAction =
  | { type: "select"; path: string }
  | { type: "expand"; path: string; open: boolean }
  | { type: "open"; path: string };

/** What an arrow / Enter / Home / End key does in the file tree, VS Code style. */
export function treeKeyAction(rows: TreeRow[], selected: string | null, key: string): TreeKeyAction | null {
  if (rows.length === 0) return null;
  const index = selected === null ? -1 : rows.findIndex((row) => row.path === selected);
  const row = index >= 0 ? rows[index] : null;
  const selectAt = (i: number) => ({ type: "select" as const, path: rows[Math.max(0, Math.min(rows.length - 1, i))].path });

  switch (key) {
    case "ArrowDown":
      return selectAt(index + 1);
    case "ArrowUp":
      return selectAt(index < 0 ? 0 : index - 1);
    case "Home":
      return selectAt(0);
    case "End":
      return selectAt(rows.length - 1);
    case "ArrowRight":
      if (!row) return selectAt(0);
      if (row.kind !== "dir") return null;
      if (!row.expanded) return { type: "expand", path: row.path, open: true };
      return rows[index + 1]?.depth === row.depth + 1 ? selectAt(index + 1) : null;
    case "ArrowLeft": {
      if (!row) return selectAt(0);
      if (row.kind === "dir" && row.expanded) return { type: "expand", path: row.path, open: false };
      const parent = parentPath(row.path);
      return parent ? { type: "select", path: parent } : null;
    }
    case "Enter":
      if (!row) return null;
      return row.kind === "dir"
        ? { type: "expand", path: row.path, open: !row.expanded }
        : { type: "open", path: row.path };
    default:
      return null;
  }
}
