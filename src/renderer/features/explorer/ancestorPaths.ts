/** Folders holding relative path `path`, outermost first: "src/a/b.ts" → ["src", "src/a"]. */
export function ancestorPaths(path: string): string[] {
  const parts = path.split("/").slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}
