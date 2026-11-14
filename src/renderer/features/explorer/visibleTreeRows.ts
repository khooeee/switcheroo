import { childPath } from "./childPath";
import type { DirListing } from "./DirListing";
import type { TreeRow } from "./TreeRow";

/** Flatten the loaded folders into the rows on screen, descending only into expanded folders. */
export function visibleTreeRows(
  listings: Record<string, DirListing>,
  expanded: ReadonlySet<string>,
): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (dir: string, depth: number) => {
    const listing = listings[dir];
    if (!listing || "error" in listing) return;
    for (const entry of listing.entries) {
      const path = childPath(dir, entry.name);
      const open = entry.kind === "dir" && expanded.has(path);
      const child = open ? listings[path] : undefined;
      rows.push({
        path,
        name: entry.name,
        kind: entry.kind,
        depth,
        expanded: open,
        error: child && "error" in child ? child.error : undefined,
      });
      if (open) walk(path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}
