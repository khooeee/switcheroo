import { readFile } from "node:fs/promises";
import { controlTokenPath } from "../storage/userDataPaths";
import { createControlToken } from "./createControlToken";

/** The control API bearer token; created once and kept across launches so the phone stays paired. */
export async function loadControlToken(): Promise<string> {
  try {
    const saved = JSON.parse(await readFile(controlTokenPath(), "utf8")) as { token?: unknown };
    if (typeof saved.token === "string" && saved.token) return saved.token;
  } catch {
    /* missing or unreadable: make a new one */
  }
  return createControlToken();
}
