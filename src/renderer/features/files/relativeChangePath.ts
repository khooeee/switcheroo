/** Strip cwd prefix so file chips show a project-relative path. */
export function relativeChangePath(path: string, cwd?: string): string {
  const prefix = cwd?.replace(/[\\/]$/, "");
  if (prefix && (path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}\\`))) {
    return path.slice(prefix.length + 1);
  }
  return path;
}
