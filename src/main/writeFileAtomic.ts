import * as fs from "node:fs/promises";
import * as path from "node:path";

/** Last write queued per target, so saves to one file never share a temp file or land out of order. */
const pending = new Map<string, Promise<void>>();

/** Write `body` to a temp file and rename it over `target`, so a crash never leaves a truncated file. */
export async function writeFileAtomic(target: string, body: string): Promise<void> {
  const write = (pending.get(target) ?? Promise.resolve()).then(async () => {
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  const settled = write.catch(() => undefined);
  pending.set(target, settled);
  void settled.then(() => {
    if (pending.get(target) === settled) pending.delete(target);
  });
  await write;
}
