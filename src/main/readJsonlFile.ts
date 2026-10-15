import * as fs from "node:fs/promises";
import { isMissingFile } from "./isMissingFile";
import { parseJsonl } from "./parseJsonl";

/** Read a JSONL file; a missing or empty file reads as no items. */
export async function readJsonlFile<T>(file: string): Promise<T[]> {
  try {
    return parseJsonl<T>(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (isMissingFile(err)) return [];
    throw err;
  }
}
