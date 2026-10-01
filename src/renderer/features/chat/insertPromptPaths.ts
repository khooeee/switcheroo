export function insertPromptPaths(
  value: string,
  start: number,
  end: number,
  paths: string[],
): { value: string; cursor: number } {
  const chunk = paths.map(quotePath).join(" ");
  const prefix = start > 0 && !/\s/.test(value[start - 1] ?? "") ? " " : "";
  const suffix = end < value.length && !/\s/.test(value[end] ?? "") ? " " : "";
  const inserted = `${prefix}${chunk}${suffix}`;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    cursor: start + inserted.length,
  };
}

function quotePath(filePath: string): string {
  return /[\s'"\\]/.test(filePath) ? `"${filePath.replace(/"/g, '\\"')}"` : filePath;
}
