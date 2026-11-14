import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import type { CronInput } from "../../shared/cronInput";
import type { CronsSnapshot } from "../../shared/cronsSnapshot";
import { errorMessage } from "../../shared/errorMessage";
import { isMissingFile } from "../storage/isMissingFile";
import { writeFileAtomic } from "../storage/writeFileAtomic";
import { parseCronsFile } from "./parseCronsFile";

/** Serialize UI writes and reject stale edits without dropping hand-edited fields. */
export class CronsStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async read(): Promise<CronsSnapshot> {
    try {
      const { snapshot } = await this.readDocument();
      return snapshot;
    } catch (error) {
      return { crons: [], revision: "", errors: [errorMessage(error)] };
    }
  }

  save(crons: CronInput[], revision: string): Promise<CronsSnapshot> {
    const run = this.queue.then(async () => {
      const { snapshot, document } = await this.readDocument();
      if (snapshot.errors.length) throw new Error(`crons.json needs fixing: ${snapshot.errors.join("; ")}`);
      if (snapshot.revision !== revision) {
        throw new Error("Crons changed outside this dialog. Close and reopen Crons to load the latest changes.");
      }
      const { errors } = parseCronsFile({ crons });
      if (errors.length) throw new Error(errors.join("; "));
      const raw = `${JSON.stringify({ ...document, crons }, null, 2)}\n`;
      await writeFileAtomic(this.filePath, raw);
      return { crons, revision: this.revision(raw), errors: [] };
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async readDocument() {
    let raw: string | null = null;
    try {
      raw = await fs.readFile(this.filePath, "utf8");
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    const document = raw?.trim() ? JSON.parse(raw) : { crons: [] };
    const { errors } = parseCronsFile(document);
    const snapshot: CronsSnapshot = {
      crons: errors.length ? [] : document.crons,
      revision: this.revision(raw),
      errors,
    };
    return { snapshot, document };
  }

  private revision(raw: string | null): string {
    return raw === null ? "missing" : createHash("sha256").update(raw).digest("hex");
  }
}
