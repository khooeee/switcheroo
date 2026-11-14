/** File name of a relative path: "src/main.ts" → "main.ts". */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
