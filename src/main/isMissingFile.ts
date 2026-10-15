/** True when a filesystem error means the path does not exist. */
export function isMissingFile(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === "ENOENT";
}
