/** `conflict`: the file changed on disk since it was loaded, so nothing was written. */
export type FileWriteResult =
  | { ok: true; mtimeMs: number }
  | { ok: false; conflict: true; mtimeMs: number };
