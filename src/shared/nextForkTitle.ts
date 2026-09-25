const FORK_SUFFIX = /^(.*) \(fork #(\d+)\)$/;

/** Next unused "[name] (fork #N)" title. Reuses an existing fork suffix and increments from there. */
export function nextForkTitle(baseTitle: string, existingTitles: Iterable<string>): string {
  const taken = new Set(existingTitles);
  const match = FORK_SUFFIX.exec(baseTitle);
  const root = match ? match[1]! : baseTitle;
  let n = match ? Number(match[2]) : 1;
  for (; ; n++) {
    const candidate = `${root} (fork #${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}
