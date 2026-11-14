/** One visible line of the file tree. */
export interface TreeRow {
  path: string;
  name: string;
  kind: "file" | "dir";
  depth: number;
  expanded: boolean;
  /** Why an expanded folder could not be read. */
  error?: string;
}
