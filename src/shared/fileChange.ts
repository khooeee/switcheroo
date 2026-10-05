interface DiffPayload {
  path: string;
  oldText?: string | null;
  newText?: string | null;
}

export interface FileChange extends DiffPayload {
  kind: "created" | "updated" | "deleted" | "moved";
}
