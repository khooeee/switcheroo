/** One child of a folder in a session's file explorer. */
export interface DirEntry {
  name: string;
  kind: "file" | "dir";
}
