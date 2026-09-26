/** Lightweight notes markup: styles spans but keeps source characters (*, #, backticks). */

export type NotesMdKind =
  | "text"
  | "bold"
  | "italic"
  | "code"
  | "codeBlock"
  | "blockquote"
  | "heading"
  | "strike";

export interface NotesMdSegment {
  kind: NotesMdKind;
  text: string;
}

export function notesMarkdownSegments(source: string): NotesMdSegment[] {
  const out: NotesMdSegment[] = [];
  let i = 0;
  let plain = "";

  const flush = () => {
    if (!plain) return;
    out.push({ kind: "text", text: plain });
    plain = "";
  };

  const take = (kind: NotesMdKind, end: number) => {
    flush();
    out.push({ kind, text: source.slice(i, end) });
    i = end;
  };

  const lineStart = () => i === 0 || source[i - 1] === "\n";

  while (i < source.length) {
    if (lineStart() && source.startsWith("```", i)) {
      const close = source.indexOf("\n```", i + 3);
      if (close !== -1) {
        take("codeBlock", close + 4);
        continue;
      }
      take("codeBlock", source.length);
      continue;
    }

    if (lineStart() && source[i] === ">") {
      let end = i;
      for (;;) {
        const eol = source.indexOf("\n", end);
        if (eol === -1) {
          end = source.length;
          break;
        }
        if (source[eol + 1] === ">") {
          end = eol + 1;
          continue;
        }
        end = eol;
        break;
      }
      take("blockquote", end);
      continue;
    }

    if (source[i] === "`") {
      const close = source.indexOf("`", i + 1);
      if (close !== -1 && !source.slice(i + 1, close).includes("\n")) {
        take("code", close + 1);
        continue;
      }
    }

    if (source.startsWith("**", i) || source.startsWith("__", i)) {
      const mark = source.slice(i, i + 2);
      const close = source.indexOf(mark, i + 2);
      if (close !== -1 && !source.slice(i + 2, close).includes("\n")) {
        take("bold", close + 2);
        continue;
      }
      plain += mark;
      i += 2;
      continue;
    }

    if (source.startsWith("~~", i)) {
      const close = source.indexOf("~~", i + 2);
      if (close !== -1 && !source.slice(i + 2, close).includes("\n")) {
        take("strike", close + 2);
        continue;
      }
      plain += "~~";
      i += 2;
      continue;
    }

    if (source[i] === "*" || source[i] === "_") {
      const mark = source[i];
      if (source[i + 1] !== mark) {
        const close = source.indexOf(mark, i + 1);
        if (close !== -1 && !source.slice(i + 1, close).includes("\n")) {
          take("italic", close + 1);
          continue;
        }
      }
    }

    if (lineStart() && source[i] === "#") {
      let hashes = 0;
      while (source[i + hashes] === "#" && hashes < 6) hashes += 1;
      if (source[i + hashes] === " " || source[i + hashes] === "\t") {
        const eol = source.indexOf("\n", i);
        take("heading", eol === -1 ? source.length : eol);
        continue;
      }
    }

    plain += source[i];
    i += 1;
  }

  flush();
  return out;
}
