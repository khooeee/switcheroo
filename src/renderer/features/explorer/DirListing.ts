import type { DirEntry } from "../../../shared/dirEntry";

/** A loaded folder, or why it could not be read. */
export type DirListing = { entries: DirEntry[] } | { error: string };
