#!/usr/bin/env node
/**
 * Seed fake session transcripts for Find in History stress testing.
 *
 * Usage:
 *   node scripts/seed-find-history.mjs
 *   node scripts/seed-find-history.mjs --sessions 80 --messages 300
 *
 * Defaults: 5000 sessions × 200 messages.
 * Writes under:
 *   ~/Library/Application Support/Switcheroo/sessions/
 *
 * Search for:  seed-find-token
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return fallback;
  const value = process.argv[idx + 1];
  return value == null ? fallback : value;
}

const sessionCount = Number(arg("sessions", "5000"));
const messagesPerSession = Number(arg("messages", "200"));
const token = "seed-find-token";
const agents = ["claude", "codex", "cursor", "pi"];
const root = path.join(os.homedir(), "Library", "Application Support", "Switcheroo", "sessions");

function dayOffset(i) {
  const date = new Date();
  date.setDate(date.getDate() - (i % 40));
  return date.toISOString().slice(0, 10);
}

async function writeSession(index) {
  const id = `${dayOffset(index)}-${randomUUID()}`;
  const dir = path.join(root, id);
  await fs.mkdir(dir, { recursive: true });
  const agent = agents[index % agents.length];
  const title = `seed-${agent}-${index + 1}`;
  const meta = {
    title,
    agent,
    cwd: process.cwd(),
    agentSessionId: null,
  };
  await fs.writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  const lines = [];
  const base = Date.now() - index * 86_400_000;
  for (let m = 0; m < messagesPerSession; m++) {
    const role = m % 2 === 0 ? "user" : "assistant";
    const includeToken = m % 17 === 0;
    const text = includeToken
      ? `Message ${m} mentions ${token} in session ${title}.`
      : `Filler message ${m} for ${title} with some padding text to make the transcript larger.`;
    lines.push(JSON.stringify({
      id: randomUUID(),
      role,
      text,
      at: base + m * 60_000,
    }));
  }
  await fs.writeFile(path.join(dir, "transcript.jsonl"), `${lines.join("\n")}\n`);
  return { id, title };
}

async function main() {
  if (!Number.isFinite(sessionCount) || sessionCount < 1) throw new Error("Invalid --sessions");
  if (!Number.isFinite(messagesPerSession) || messagesPerSession < 1) {
    throw new Error("Invalid --messages");
  }
  await fs.mkdir(root, { recursive: true });
  console.log(`Seeding ${sessionCount} sessions × ${messagesPerSession} messages into:\n  ${root}`);
  for (let i = 0; i < sessionCount; i++) {
    const made = await writeSession(i);
    if ((i + 1) % 10 === 0 || i === 0) console.log(`  ${i + 1}/${sessionCount} ${made.title}`);
  }
  console.log(`Done. In Find in History, search for: ${token}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
