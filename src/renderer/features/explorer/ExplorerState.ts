/** One session's file explorer. Paths are project-relative, or absolute for external editor tabs. */
export interface ExplorerState {
  /** Expanded folders (the root is always open). */
  expanded: readonly string[];
  /** Highlighted tree row. */
  selected: string | null;
  /** Editor tabs, left to right. */
  openFiles: readonly string[];
  activeFile: string | null;
  /** The tab the next previewed file takes over; null once it is kept. */
  previewFile: string | null;
}
