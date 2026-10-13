#!/usr/bin/env node
/**
 * Kill the ACP agent processes Switcheroo spawned, to test how sessions
 * recover when an agent dies outside the app.
 *
 * Only agents whose parent is a running Switcheroo (the packaged app, or
 * `npm start` from this checkout) are touched. Other apps' ACP agents, the
 * standalone Codex app-server daemon and Switcheroo's terminal shells are left
 * alone. Each agent's own child processes (e.g. codex app-server) go with it.
 *
 * Usage:
 *   node scripts/kill-acp-agents.mjs                 # SIGTERM every Switcheroo agent
 *   node scripts/kill-acp-agents.mjs --dry-run       # list what would be killed
 *   node scripts/kill-acp-agents.mjs --match codex   # only agents whose command contains "codex"
 *   node scripts/kill-acp-agents.mjs --signal KILL
 *
 * Then send a message in a session that was open: it should resume on a fresh agent.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const devElectron = join(projectRoot, "node_modules", "electron", "dist") + "/";

/** Adapter bins (`claude-agent-acp/`, `codex-acp/`, `pi-acp/`) or an `acp` mode arg (Cursor, Prime). */
const ACP_COMMAND = /-acp\/|\sacp(\s|$)/;

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return fallback;
  const value = process.argv[idx + 1];
  return value == null ? fallback : value;
}

const dryRun = process.argv.includes("--dry-run");
const match = arg("match", "");
const rawSignal = arg("signal", "SIGTERM").toUpperCase();
const signal = rawSignal.startsWith("SIG") ? rawSignal : `SIG${rawSignal}`;

function listProcesses() {
  const out = execFileSync("ps", ["-axo", "pid=,ppid=,command="], { encoding: "utf8" });
  return out.split("\n").flatMap((line) => {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }] : [];
  });
}

/** Electron main process: packaged Switcheroo.app, or `npm start` from this checkout. */
function isSwitcheroo(command) {
  return command.includes("/Switcheroo.app/Contents/MacOS/") || command.includes(devElectron);
}

function descendants(pid, procs) {
  return procs
    .filter((proc) => proc.ppid === pid)
    .flatMap((child) => [child, ...descendants(child.pid, procs)]);
}

function kill(proc, indent) {
  console.log(`${indent}${dryRun ? "would kill" : "kill"} ${proc.pid}  ${proc.command.slice(0, 140)}`);
  if (dryRun) return;
  try {
    process.kill(proc.pid, signal);
  } catch (error) {
    console.warn(`${indent}  failed: ${error.code ?? error.message}`);
  }
}

const procs = listProcesses();
const apps = new Set(procs.filter((proc) => isSwitcheroo(proc.command)).map((proc) => proc.pid));
if (apps.size === 0) {
  console.log("Switcheroo is not running.");
  process.exit(0);
}

const agents = procs.filter(
  (proc) => apps.has(proc.ppid) && ACP_COMMAND.test(proc.command) && proc.command.includes(match),
);
if (agents.length === 0) {
  console.log("No Switcheroo ACP agents running. Open a session and send a message first.");
  process.exit(0);
}

for (const agent of agents) {
  // Agent first, so Switcheroo sees its connection close rather than a backend error.
  kill(agent, "");
  for (const child of descendants(agent.pid, procs)) kill(child, "  ");
}
console.log(`${dryRun ? "Would send" : "Sent"} ${signal} to ${agents.length} agent(s).`);
