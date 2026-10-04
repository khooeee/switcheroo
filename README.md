# Switcheroo

Why another coding agent?

To remove & simplify as much as possible for maximum focus:
- Sending new messages while the agent is already in progress should always steer where available, otherwise queue.  Claude Code & Codex steer.  Cursor & Pi queue, due to lack of support for queueing in their ACP implementation.  But in general, I think the concept of queueing should just go away and every coding agent should always steer.
- The user message & final assistant summary message are the only messages shown in the main content area because most of the time, seeing the tool calls & other events are unnecessary.  You can always open them by right clicking on the message and selecting turn details.
- Each session on the left sidebar only shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and it can be multiline as well.  If you supply URLs, they will be linked as well so you can stuff things into it like issue/PR URLs, etc.
- No maintenance of past sessions, switchboard, etc. needed from you - we trim the session list & switchboard, however everything still stays on disk and is easily accessible through find in history.
- Project management is basically having a prefix to define what project you're on.  Pinning sessions will put them at the top of the list, and once you're done, unpin and they will slowly float down.
- There's no in-built file explorer, editor, diff viewer, artifact mode, terminal, etc.  Other apps already do that extremely well.  If you want them, tile your windows.  The focus here is to build the optimal coding chat experience.
- Best paired with [beaver](https://github.com/khooeee/beaver/)

More find features beyond just the current session are supported:
- Find within specific message, not the entire session
- Find in turn details
- Find in switchboard will search your recent history (up to 30 days so it's faster than searching your entire history)
- Find in history will search your entire history
- And find in the current session works as usual

There are also speed optimizations to eliminate unnecessary waiting:
- Pre-warmed session so time to first prompt is very fast
- Find in history is a streaming search and has been load tested on a large history.

There's also orchestration features:
- "Switcheroo aware" sessions can create other sessions, rename them, send prompts to them, read them & close them.  In other words, pretty much everything session-specific aside from forking.  This can lead to very useful parallelization (e.g. reading GitHub issues & implementing them in parallel).

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
