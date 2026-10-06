/** Filename per path, widened one parent folder at a time until no other path shares it. */
export function shortChangeNames(paths: string[]): string[] {
  const segments = paths.map((path) => path.split(/[\\/]/).filter(Boolean));
  const suffix = (parts: string[], depth: number) => parts.slice(-depth).join("/");
  return segments.map((parts, index) => {
    let depth = 1;
    while (
      depth < parts.length &&
      segments.some((other, j) => j !== index && suffix(other, depth) === suffix(parts, depth))
    ) {
      depth++;
    }
    return suffix(parts, depth);
  });
}
