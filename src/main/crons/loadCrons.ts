import * as fs from "node:fs/promises";
import { isMissingFile } from "../isMissingFile";
import { cronsPath } from "../userDataPaths";
import type { CronJob } from "./CronJob";
import { parseCronsFile } from "./parseCronsFile";
import { errorMessage } from "../../shared/errorMessage";

/** Read crons.json. A missing file means no crons; problems come back as errors, never thrown. */
export async function loadCrons(): Promise<{ jobs: CronJob[]; errors: string[] }> {
  let raw: string;
  try {
    raw = await fs.readFile(cronsPath(), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return { jobs: [], errors: [] };
    return { jobs: [], errors: [String(error)] };
  }
  if (!raw.trim()) return { jobs: [], errors: [] };
  try {
    return parseCronsFile(JSON.parse(raw));
  } catch (error) {
    return { jobs: [], errors: [`invalid JSON: ${errorMessage(error)}`] };
  }
}
