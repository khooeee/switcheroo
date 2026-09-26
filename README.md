# Switcheroo

Multi-tab agent development client

Run Claude Code, Codex, Cursor, or Pi side-by-side and track all agent logs through a central event feed (aka the switchboard).

## Features

- Switchboard
- Each session has its own notes.

## Prerequisites

- Node.js 20+
- At least one ACP agent installed and authenticated:
  - **Claude Code**: Claude login or `ANTHROPIC_API_KEY`
  - **Codex**: `codex login` or `OPENAI_API_KEY`
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

- All agents are started in bypass permissions/YOLO mode.

## History management

We don't manage history for you.  Nothing gets archived or deleted unless you do it.  Hence, if things start to get slow, you can always do the following (it's very quick & painless I assure you):

- If your session list on the left has too many items, you can shift click to select a range, right click and select Archive.

## Shortcuts

**Ctrl+C**: Stop agent (prompt, while running)

**Ctrl+D**: Archive session (empty prompt)

**Ctrl+0**: Switchboard

**Ctrl+1–9**: Select session tab 1–9

**Cmd/Ctrl+Shift+E**: Focus session tabs (↑/↓ move, Space/Enter select)

**Cmd/Ctrl+F**: Find

**Cmd/Ctrl+I**: Focus on prompt

**Cmd/Ctrl+N**: New agent session

**Cmd/Ctrl+Shift+N**: Focus notes
