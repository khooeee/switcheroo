interface DiffPayload {
  path: string;
  oldText?: string | null;
  newText?: string | null;
}

export interface FileChange extends DiffPayload {
  kind: "created" | "updated" | "deleted" | "moved";
  /** Where a moved file came from; `path` is where it went. */
  fromPath?: string;
}
