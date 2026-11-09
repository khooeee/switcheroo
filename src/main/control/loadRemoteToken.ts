import { readFile } from "node:fs/promises";
import { remoteTokenPath } from "../storage/userDataPaths";
import { createRemoteToken } from "./createRemoteToken";

/** The iOS app's bearer token; created once and kept across launches so the phone stays paired. */
export async function loadRemoteToken(): Promise<string> {
  try {
    const saved = JSON.parse(await readFile(remoteTokenPath(), "utf8")) as { token?: unknown };
    if (typeof saved.token === "string" && saved.token) return saved.token;
  } catch {
    /* missing or unreadable: make a new one */
  }
  return createRemoteToken();
}
