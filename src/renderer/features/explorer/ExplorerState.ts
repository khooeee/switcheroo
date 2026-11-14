/** One session's file explorer: tree and editor tabs. Paths are relative to the session cwd. */
export interface ExplorerState {
  /** Expanded folders (the root is always open). */
  expanded: readonly string[];
  /** Highlighted tree row. */
  selected: string | null;
  /** Editor tabs, left to right. */
  openFiles: readonly string[];
  activeFile: string | null;
}
