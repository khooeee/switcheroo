interface DiffLine {
  kind: "context" | "removed" | "added";
  text: string;
  oldLine?: number;
  newLine?: number;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const oldLines = before === "" ? [] : before.split("\n");
  const newLines = after === "" ? [] : after.split("\n");
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  const add = (kind: DiffLine["kind"]) => {
    if (kind === "context") result.push({ kind, text: oldLines[i], oldLine: ++i, newLine: ++j });
    if (kind === "removed") result.push({ kind, text: oldLines[i], oldLine: ++i });
    if (kind === "added") result.push({ kind, text: newLines[j], newLine: ++j });
  };
  while (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) add("context");
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > i && newEnd > j && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const startI = i;
  const startJ = j;
  const width = newEnd - j + 1;
  const height = oldEnd - i + 1;
  // Bound diff computation for large tool outputs. The fallback still shows
  // exact before/after lines, treating the changed middle as a replacement.
  if (width * height <= 250_000) {
    const lengths = new Uint32Array(width * height);
    for (let row = height - 2; row >= 0; row--) {
      for (let column = width - 2; column >= 0; column--) {
        lengths[row * width + column] = oldLines[startI + row] === newLines[startJ + column]
          ? 1 + lengths[(row + 1) * width + column + 1]
          : Math.max(lengths[(row + 1) * width + column], lengths[row * width + column + 1]);
      }
    }
    while (i < oldEnd && j < newEnd) {
      if (oldLines[i] === newLines[j]) add("context");
      else if (lengths[(i - startI + 1) * width + j - startJ] >= lengths[(i - startI) * width + j - startJ + 1]) add("removed");
      else add("added");
    }
  }
  while (i < oldEnd) add("removed");
  while (j < newEnd) add("added");
  while (i < oldLines.length && j < newLines.length) add("context");
  return result;
}
