import { openOrCreateFile } from "./openOrCreateFile";
import { cronsPath } from "./userDataPaths";

// A disabled example documents the fields; it never runs until enabled is true.
const STARTER_CRONS = JSON.stringify(
  {
    crons: [
      {
        title: "Example YYYY-MM-DD HH:MM",
        agent: "claude",
        cron: "0 9 * * 1-5",
        cwd: "~/code/my-project",
        prompt: "Summarize yesterday's commits.",
        enabled: false,
        switcherooAware: false,
      },
    ],
  },
  null,
  2,
);

/** Open crons.json in the default app (create a starter file if missing). */
export function openCronsFile(): Promise<void> {
  return openOrCreateFile(cronsPath(), `${STARTER_CRONS}\n`);
}
