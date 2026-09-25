import { homedir } from "node:os";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ControlEndpoint {
  port: number;
  token: string;
  spec: string;
}

const DIR = join(homedir(), ".switcheroo");
export const CONTROL_FILE = join(DIR, "control.json");

export async function writeControlFile(endpoint: ControlEndpoint): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(CONTROL_FILE, `${JSON.stringify(endpoint, null, 2)}\n`, { mode: 0o600 });
}

/** Remove control.json only if it still matches this server's token and port. */
export async function clearControlFile(endpoint: ControlEndpoint): Promise<void> {
  try {
    const raw = await readFile(CONTROL_FILE, "utf8");
    const current = JSON.parse(raw) as Partial<ControlEndpoint>;
    if (current.port !== endpoint.port || current.token !== endpoint.token) return;
    await unlink(CONTROL_FILE);
  } catch {
    /* missing or unreadable is fine */
  }
}

export function bearerAuthorized(header: string | undefined, token: string): boolean {
  if (!header) return false;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return !!match && match[1] === token;
}
