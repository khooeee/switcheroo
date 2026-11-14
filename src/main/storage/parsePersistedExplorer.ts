import type { PersistedExplorer } from "../../shared/persistedExplorer";
import { isRecord } from "../../shared/isRecord";

const MAX_PATHS = 2000;

function paths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, MAX_PATHS);
}

function pathOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function offset(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Explorer state from disk or the renderer, with anything malformed dropped. */
export function parsePersistedExplorer(value: unknown): PersistedExplorer | null {
  if (!isRecord(value)) return null;
  const openFiles = paths(value.openFiles);
  const fileTops: Record<string, number> = {};
  if (isRecord(value.fileTops)) {
    for (const file of openFiles) {
      if (Object.hasOwn(value.fileTops, file)) fileTops[file] = offset(value.fileTops[file]);
    }
  }
  const activeFile = pathOrNull(value.activeFile);
  return {
    expanded: paths(value.expanded),
    selected: pathOrNull(value.selected),
    openFiles,
    activeFile: activeFile && openFiles.includes(activeFile) ? activeFile : openFiles[0] ?? null,
    treeScrollTop: offset(value.treeScrollTop),
    fileTops,
  };
}
