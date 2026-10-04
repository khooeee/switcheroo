# Switcheroo

High productivity ACP coding agent

Run Claude Code, Codex, Cursor, or Pi side-by-side and tracks all agents through a central event feed known as the switchboard

The philosophy is to remove & simplify as much as possible for maximum focus:
- Steer only where available, otherwise queue.  Claude Code & Codex steer.  Cursor & Pi queue.
- The user message & final assistant summary message are the only messages shown in main content area because most of the time, seeing the tool calls & other events are unnecessary.  However, you can see the turn details when you need to debug an issue.
- Each session on the left sidebar only shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and you can use it to keep track of small details like issue/PRs, clickable links, etc. plus it can be multiline.
- No maintenance of past sessions, switchboard, etc. needed from you - we trim the session list & switchboard, however everything still stays on disk and is easily accessible through find in history.
- There's no in-built file explorer, editor, artifact mode, terminal, etc.  Other apps already do that really well.  If you want those, tile your file explorer, browser, mobile emulator, terminal windows, etc. as needed.
- Best paired with [beaver](https://github.com/khooeee/beaver/)

There are also speed optimizations to eliminate unnecessary waiting:
- Pre-warmed session so time to first prompt is very fast
- Find in history is a streaming search and has been load tested on a large history.

There are also niceties
- Find in specific message, not the entire session
- Find in turn details will only search in the turn details

## Prerequisites

- Node.js 22 LTS (`>=22.12.0 <23`)
- At least one ACP agent authenticated (Claude Code, Codex, and Pi ACP adapters ship with `npm install`):
  - **Claude Code**: Claude login or `ANTHROPIC_API_KEY`
  - **Codex**: Codex/ChatGPT login or `OPENAI_API_KEY` / `CODEX_API_KEY`
  - **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`
  - **Pi**: `pi` on `PATH` via `npm install -g @earendil-works/pi-coding-agent`

## Develop

```bash
npm install
npm start
```

## Usage

1. Click **+** to create a session.
2. Ticking **Switcheroo aware** will inject a prompt at the beginning of the session which will allow that session to create & control other sessions in Switcheroo.

On the top left, you'll see **Switchboard** which will show you a live feed of all events from all sessions.  Click a session title to jump to that session, or use the arrow next to Copy to open turn details.

## Defaults

- All agents are started in bypass permissions/YOLO mode.
- Zen mode is on because it's generally not useful to look at all the tool calls, timestamps, etc.  You can always turn it off to see those details as needed.
- While a turn is running, follow-up messages **steer** if the agent advertises ACP steering support (typically Claude Code & Codex); otherwise they are **queued**.

## Steer or Queue?

When you send a message while the agent is already thinking, we prefer steering if it is available.  However not all ACP adapters support steering, so those agents will queue instead.

| Agent | Mid-turn follow-ups |
|-------|---------------------|
| Claude Code | Steer |
| Codex | Steer |
| Cursor | Queue |
| Pi | Queue |

## History management

It's likely you don't have to read this section ever, but it's here in case the app gets slow.

- If the session is slow due to a long transcript, you should just start a new session.
- Switchboard events older than 30 days are cleaned up on app startup.  Sessions will still be on disk.  If the switchboard is slow due to a long event feed, You can edit `settings.cleanSwitchboardTurnsOlderThanDays` in `switcheroo.json` to a lower number and restart the app to cleanup older turns in your switchboard.
- The session list is capped to 200 on app startup (can be edited via `settings.sessionListMax`).  Overflow unpinned sessions are closed first (still on disk; pinned sessions count toward the cap).  You can still find closed sessions through "Find in History".
- If you're running out of disk space, click on Settings button on bottom left, select "Open Sessions Folder" and then archive/delete as you wish (folder names are prefixed with YYYY-MM-DD which is when those sessions started).  Keep in mind those sessions might still show up in your session list or switchboard until you click them.  Only then will the app check its existence and remove it from the list/switchboard if it doesn't exist anymore.  This was done to avoid extra checks in the app to maximize app performance.

## Shortcuts

**Ctrl+C**: Stop agent (while running); clear prompt when idle with text

**Ctrl+D**: Close session on empty prompt

**Escape**: Stop agent (while running)

**Ctrl+0**: Switchboard

**Ctrl+1–9**: Select session list 1–9

**Ctrl+Tab**: Go to next session

**Ctrl+Shift+Tab**: Go to previous session

**Cmd/Ctrl+F**: Find in current session

**Cmd/Ctrl+Shift+F**: Find in History (searches all sessions on disk)

**Cmd/Ctrl+I**: Focus prompt

**Cmd/Ctrl+N**: New agent session

**Cmd/Ctrl+R**: Rename selected session

**Cmd/Ctrl+P**: Pin/unpin selected session

**Cmd/Ctrl+U**: Mark as Unread

**Cmd/Ctrl+W**: Close selected session

**Cmd/Ctrl+Y**: Fork selected session

**Cmd+/**: Toggle zen mode

**/**: shows autocomplete of slash commands in the composer
