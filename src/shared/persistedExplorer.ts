/** One session's file explorer as saved in its folder's explorer.json. Paths are relative to the cwd. */
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
