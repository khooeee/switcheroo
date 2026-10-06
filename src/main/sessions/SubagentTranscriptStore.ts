import type { TranscriptTurn } from "../../shared/transcript";
import { mergeTurnsById } from "../../shared/mergeTurnsById";
import { finalizeStalledTurns } from "../finalizeStalledTurns";
import {
  copySubagentTranscripts,
  loadSubagentTranscript,
  saveSubagentTranscript,
} from "../subagentTranscripts";

type Entry = { sessionId: string; subagentId: string; turns: TranscriptTurn[] };

const keyOf = (sessionId: string, subagentId: string) => `${sessionId}\n${subagentId}`;

/** Subagent transcripts in memory, written under the session folder shortly after they change. */
export class SubagentTranscriptStore {
  private entries = new Map<string, Entry>();
  private dirty = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  record(sessionId: string, subagentId: string, turn: TranscriptTurn): void {
    const key = keyOf(sessionId, subagentId);
    const entry = this.entries.get(key) ?? { sessionId, subagentId, turns: [] };
    entry.turns = mergeTurnsById(entry.turns, [turn]);
    this.entries.set(key, entry);
    this.dirty.add(key);
    this.schedule();
  }

  /** Saved history plus anything streamed since launch. */
  async get(sessionId: string, subagentId: string): Promise<TranscriptTurn[]> {
    const saved = finalizeStalledTurns(await loadSubagentTranscript(sessionId, subagentId));
    const key = keyOf(sessionId, subagentId);
    const turns = mergeTurnsById(saved, this.entries.get(key)?.turns ?? []);
    this.entries.set(key, { sessionId, subagentId, turns });
    return turns;
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const keys = [...this.dirty];
    this.dirty.clear();
    await Promise.all(keys.map(async (key) => {
      const entry = this.entries.get(key);
      if (!entry) return;
      try {
        await saveSubagentTranscript(entry.sessionId, entry.subagentId, entry.turns);
      } catch (error) {
        this.dirty.add(key);
        throw error;
      }
    }));
  }

  async copySession(fromSessionId: string, toSessionId: string): Promise<void> {
    await this.flush();
    await copySubagentTranscripts(fromSessionId, toSessionId);
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      // A failed write stays dirty and is retried on the next change or quit.
      void this.flush().catch(() => undefined);
    }, 500);
  }
}
