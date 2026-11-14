/** Saved file explorer; paths are project-relative, or absolute for external editor tabs. */
export interface PersistedExplorer {
  expanded: string[];
  selected: string | null;
  openFiles: string[];
  activeFile: string | null;
  previewFile: string | null;
  treeScrollTop: number;
  /** Document position at the top of each open file's viewport. */
  fileTops: Record<string, number>;
}
