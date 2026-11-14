/** Where Save As wrote a file (relative to the session cwd) and its disk mtime. */
export interface SavedFile {
  path: string;
  mtimeMs: number;
}
