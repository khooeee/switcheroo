# Switcheroo

Multi-tab agent development client

Run Claude Code, Codex, or Cursor side-by-side and monitor all agents through an event feed (aka its the switchboard).

## Prerequisites

- Node.js 20+
- At least one ACP agent installed and authenticated:
  - **Claude Code**: Claude login or `ANTHROPIC_API_KEY` (launched via `@agentclientprotocol/claude-agent-acp`)
  - **Codex**: `codex login` or `OPENAI_API_KEY` (via `@zed-industries/codex-acp`)
  - **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`

## Develop

```bash
npm install
npx electron-rebuild -f -w node-pty
npm start
```

## Usage

1. Click **+** to create a session tab (pick agent + workspace folder).
2. Open **Switchboard** (★) for a live feed of all tab events — click an event to jump to its tab.

## Shortcuts

**Cmd/Ctrl+F** finds text in the active Master feed or chat transcript (Monaco uses its own find when the editor is focused).
