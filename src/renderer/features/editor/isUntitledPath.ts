/** A new tab not saved yet. Its path starts with "/", which no file's relative path does. */
export function isUntitledPath(path: string): boolean {
  return path.startsWith("/");
}
