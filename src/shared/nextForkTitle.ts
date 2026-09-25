/** Next unused "[name] (fork #N)" title among existing session titles. */
export function nextForkTitle(baseTitle: string, existingTitles: Iterable<string>): string {
  const taken = new Set(existingTitles);
  for (let n = 1; ; n++) {
    const candidate = `${baseTitle} (fork #${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}
