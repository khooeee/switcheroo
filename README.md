# Switcheroo

Multi-tab agent development client

Run Claude Code, Codex, Cursor, or Pi side-by-side and monitor all agents through an event feed (aka its the switchboard).

## Features

- Switchboard
- Tab notes

## Prerequisites

- Node.js 20+
- At least one ACP agent installed and authenticated:
  - **Claude Code**: Claude login or `ANTHROPIC_API_KEY` (launched via `@agentclientprotocol/claude-agent-acp`)
  - **Codex**: `codex login` or `OPENAI_API_KEY` (via `@zed-industries/codex-acp`)
  - **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`
  - **Pi**: `pi` on `PATH` via `@earendil-works/pi-coding-agent`, launched through `pi-acp`

## Develop

```bash
npm install
npx electron-rebuild -f -w node-pty
npm start
```

## Usage

1. Click **+** to create a session tab (pick agent + workspace folder).
2. Open **Switchboard** for a live feed of all events from all sessions — click an event to jump to its tab.

## Defaults

- Bypass permissions / YOLO

## Shortcuts

**Ctrl+C**: Stop agent (prompt, while running)

**Ctrl+D**: Close session (empty prompt)

**/**: Slash-command autocomplete above the prompt

**Cmd/Ctrl+F**: Find

**Cmd/Ctrl+I**: Focus on prompt
