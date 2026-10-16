/** A literal word, or null when it needs an expansion ($var, `cmd`, glob, ~) we cannot resolve. */
export type ShellWord = string | null;

/**
 * Splits a shell script into simple commands of words. Handles quotes, escapes, separators
 * (`;`, `&&`, `||`, `|`, newlines), redirections and heredoc bodies; it does not run anything.
 */
export function shellCommands(script: string): ShellWord[][] {
  const commands: ShellWord[][] = [];
  const heredocs: string[] = [];
  let words: ShellWord[] = [];
  let word = "";
  let inWord = false;
  let literal = true;
  /** The next word is a redirect target or heredoc delimiter, not an argument. */
  let pending: "redirect" | "heredoc" | null = null;

  const endWord = () => {
    if (!inWord) return;
    if (pending === "heredoc") heredocs.push(word);
    else if (pending === null) words.push(literal ? word : null);
    pending = null;
    word = "";
    inWord = false;
    literal = true;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };

  let i = 0;
  while (i < script.length) {
    const c = script[i];
    const next = script[i + 1];
    if (c === "'") {
      const end = closing(script, "'", i + 1);
      word += script.slice(i + 1, end);
      inWord = true;
      i = end + 1;
    } else if (c === '"') {
      i = doubleQuoted(script, i + 1, (text, plain) => {
        word += text;
        literal &&= plain;
      });
      inWord = true;
    } else if (c === "\\") {
      if (next !== undefined && next !== "\n") {
        word += next;
        inWord = true;
      }
      i += 2;
    } else if (c === "\n") {
      endCommand();
      i = skipHeredocBodies(script, i + 1, heredocs.splice(0));
    } else if (c === " " || c === "\t") {
      endWord();
      i++;
    } else if (c === "#" && !inWord) {
      i = closing(script, "\n", i);
    } else if (c === ">" || c === "<" || (c === "&" && next === ">")) {
      // A word of digits right before the operator is a file descriptor (`2>`), not an argument.
      if (inWord && literal && /^\d+$/.test(word)) {
        word = "";
        inWord = false;
      }
      endWord();
      if (c === "<" && next === "<" && script[i + 2] !== "<") {
        pending = "heredoc";
        i += script[i + 2] === "-" ? 3 : 2;
      } else {
        pending = "redirect";
        i++;
        while (script[i] === ">" || script[i] === "<" || script[i] === "&" || script[i] === "|") i++;
      }
    } else if (";&|()".includes(c)) {
      endCommand();
      i++;
    } else {
      if (c === "$" || c === "`" || c === "*" || c === "?" || c === "[" || (c === "~" && !inWord)) {
        literal = false;
      }
      word += c;
      inWord = true;
      i++;
    }
  }
  endCommand();
  return commands;
}

function closing(script: string, quote: string, from: number): number {
  const end = script.indexOf(quote, from);
  return end < 0 ? script.length : end;
}

/** Reads a "…" body starting after the opening quote; returns the index after the closing quote. */
function doubleQuoted(script: string, from: number, add: (text: string, plain: boolean) => void): number {
  let i = from;
  while (i < script.length && script[i] !== '"') {
    const c = script[i];
    if (c === "\\" && '$`"\\\n'.includes(script[i + 1] ?? "")) {
      if (script[i + 1] !== "\n") add(script[i + 1], true);
      i += 2;
      continue;
    }
    add(c, c !== "$" && c !== "`");
    i++;
  }
  return i + 1;
}

/** Skips each heredoc body, line by line, through its delimiter line. */
function skipHeredocBodies(script: string, from: number, delimiters: string[]): number {
  let i = from;
  for (const delimiter of delimiters) {
    while (i < script.length) {
      const end = closing(script, "\n", i);
      // `<<-` strips leading tabs; accepting them for `<<` too keeps this simple.
      const line = script.slice(i, end).replace(/^\t+/, "");
      i = end + 1;
      if (line === delimiter) break;
    }
  }
  return i;
}
