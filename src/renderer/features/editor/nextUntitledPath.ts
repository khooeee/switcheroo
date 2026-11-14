/** Path for a new untitled tab: "/Untitled-1", or the first number no open tab has. */
export function nextUntitledPath(openFiles: readonly string[]): string {
  for (let n = 1; ; n++) {
    const path = `/Untitled-${n}`;
    if (!openFiles.includes(path)) return path;
  }
}
