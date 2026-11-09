import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { controlTokenPath } from "../storage/userDataPaths";

/** Make and save a new control API bearer token, replacing any old one. */
export async function createControlToken(): Promise<string> {
  const file = controlTokenPath();
  const token = randomBytes(24).toString("hex");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ token }, null, 2)}\n`, { mode: 0o600 });
  return token;
}
