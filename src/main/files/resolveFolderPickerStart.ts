import * as fs from "node:fs/promises";

/** Return `startPath` when it is an existing directory; otherwise undefined. */
export async function resolveFolderPickerStart(
  startPath?: string,
): Promise<string | undefined> {
  const trimmed = startPath?.trim();
  if (!trimmed) return undefined;
  try {
    const stat = await fs.stat(trimmed);
    return stat.isDirectory() ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
