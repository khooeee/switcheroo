import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MasterEvent } from "../shared/types";
import { switchboardPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

export async function loadSwitchboardEvents(): Promise<MasterEvent[]> {
  try {
    const raw = await fs.readFile(switchboardPath(), "utf8");
    if (!raw.trim()) return [];
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as MasterEvent);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveSwitchboardEvents(events: MasterEvent[]): Promise<void> {
  const target = switchboardPath();
  const tmp = `${target}.${process.pid}.tmp`;
  const body = events.length ? `${events.map((event) => JSON.stringify(event)).join("\n")}\n` : "";
  const save = pendingSave.then(async () => {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
