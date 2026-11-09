/** A session title: the rail prefix, then the name. */
export function sessionTitleWithPrefix(prefix: string, name: string): string {
  return [prefix.trim(), name.trim()].filter(Boolean).join(" ");
}
