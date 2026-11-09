import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { controlTokenPath } from "../storage/userDataPaths";

/** The control API bearer token; created once and kept across launches so the phone stays paired. */
export async function loadControlToken(): Promise<string> {
  const file = controlTokenPath();
  try {
    const saved = JSON.parse(await readFile(file, "utf8")) as { token?: unknown };
    if (typeof saved.token === "string" && saved.token) return saved.token;
  } catch {
    /* missing or unreadable: make a new one */
  }
  const token = randomBytes(24).toString("hex");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ token }, null, 2)}\n`, { mode: 0o600 });
  return token;
}
