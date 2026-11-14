/** A session file as the editor can show it; `mtimeMs` guards later saves against outside edits. */
export type FileContent =
  | { kind: "text"; text: string; mtimeMs: number }
  | { kind: "image"; dataUrl: string; mtimeMs: number }
  | { kind: "binary"; size: number }
  | { kind: "tooLarge"; size: number }
  | { kind: "missing" };
