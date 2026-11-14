/** Folder holding relative path `path`: "src/a.ts" → "src", "a.ts" → "". */
export function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}
