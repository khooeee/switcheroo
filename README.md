# Switcheroo

An agentic development environment that attempts to spark joy in your everyday coding:
- The user message & final assistant message are the only messages shown in the main content area.  Most of the time, seeing the tool calls & other events are unnecessary.  You can always open them by right clicking on the message and selecting turn details.
- Each session on the left sidebar shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and it can be multiline as well.  If you supply URLs, they will be linked as well so you can stuff things into it like issue/PR URLs, etc.
- Project management is having a prefix to define what project you're on.  Pinning sessions will put them at the top of the list, and once you're done, unpin and they will slowly float down.  There are multiple ways to find them later on (find in turn details, session, switchboard or history).
- Sending new messages while the agent is already in progress should always steer where available, otherwise queue.  Claude Code & Codex steer.  Cursor, Pi & Prime Agent queue (due to lack of support for steering in their ACP implementation).  But in general, I think the concept of queueing should just go away and every coding agent should always steer.
- All agents are started in bypass permissions/YOLO mode.  Use a sandbox if you're worried about
- Zen mode hides the message type & timestamps.  It's on by default.  You can always turn it off to see those details as needed with Command/Control + /.

- Best paired with [beaver](https://github.com/khooeee/beaver/)

There are also speed optimizations to eliminate unnecessary waiting:
- Pre-warmed session pool so time to first prompt is very fast
- Find in history is a streaming search and has been load tested on a large history.

There's also some niceties:
- Copy message or copy individual code blocks
- Preview Markdown files like how they would appear in GitHub

There's also orchestration features:
- "Switcheroo aware" sessions can create other sessions, rename them, send prompts to them, read them & close them.  In other words, pretty much everything session-specific aside from forking.  This can lead to very useful parallelization (e.g. reading GitHub issues & implementing them in parallel).

## Install (macOS)

Download `Switcheroo-*-arm64.dmg` from the latest [GitHub Release](https://github.com/khooeee/switcheroo/releases). Apple Silicon (M1 onwards) only.

Open the `.dmg`, drag **Switcheroo** into Applications, then launch it.

Builds are not notarized. On first open, macOS says it can't verify the app. Go to **System Settings** → **Privacy & Security** and click **Open Anyway**, or clear quarantine:

```bash
xattr -cr /Applications/Switcheroo.app
```

## Prerequisites

At least one agent CLI installed and authenticated. The Claude Code, Codex, and Pi ACP adapters ship with the app, but every agent runs on your own installed CLI:

- **Claude Code**: `claude` on `PATH` (e.g. `brew install --cask claude-code`) and Claude login or `ANTHROPIC_API_KEY`
- **Codex**: `codex` on `PATH` (e.g. `brew install --cask codex`) and Codex/ChatGPT login or `OPENAI_API_KEY` / `CODEX_API_KEY`
- **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`
- **Pi**: `pi` on `PATH` via `npm install -g @earendil-works/pi-coding-agent`
- **Prime Agent**: `prime-agent` on `PATH` (installer puts it in `~/.local/bin`) and authenticated via `/login` or a provider API key

## Develop

```bash
npm install
npm start
```

## Usage

1. Click **+** to create a session.
2. Ticking **Switcheroo aware** will inject a prompt at the beginning of the session which will allow that session to create & control other sessions in Switcheroo.

On the top left, you'll see **Switchboard** which will show you a live feed of all events from all sessions.  Click a session title to jump to that session, or use the arrow next to Copy to open turn details.

## History management

It's likely you don't have to read this section ever, but it's here in case the app gets slow.

- If the session is slow due to a long transcript, you should just start a new session.
- Switchboard events older than 30 days are cleaned up on app startup.  Sessions will still be on disk.  If the switchboard is slow due to a long event feed, You can edit `settings.cleanSwitchboardTurnsOlderThanDays` in `switcheroo.json` to a lower number and restart the app to cleanup older turns in your switchboard.
- The session list is capped to 500 on app startup (can be edited via `settings.sessionListMax`).  Overflow unpinned sessions are closed first (still on disk; pinned sessions count toward the cap).  You can still find closed sessions through "Find in History".
- If you're running out of disk space, click on Settings button on bottom left, select "Open Sessions Folder" and then archive/delete as you wish (folder names are prefixed with YYYY-MM-DD which is when those sessions started).  Keep in mind those sessions might still show up in your session list or switchboard until you click them.  Only then will the app check its existence and remove it from the list/switchboard if it doesn't exist anymore.  This was done to avoid extra checks in the app to maximize app performance.

## Shortcuts

**Ctrl+C**: Stop agent (while running); clear prompt when idle with text

**Ctrl+D**: Close session on empty prompt

**Escape**: Stop agent (while running)

**Cmd/Ctrl+0**: Switchboard

**Ctrl+Tab**: Go to next visible tab

**Ctrl+Shift+Tab**: Go to previous visible tab

**Cmd/Ctrl+F**: Find in current session

**Cmd/Ctrl+Shift+F**: Find in History (searches all sessions on disk)

**Cmd/Ctrl+I**: Focus prompt

**Cmd/Ctrl+G**: Focus filter tabs

**Cmd/Ctrl+N**: New session

**Cmd/Ctrl+T**: New terminal

**Cmd/Ctrl+R**: Rename selected tab

**Cmd/Ctrl+P**: Pin/unpin selected session

**Cmd/Ctrl+U**: Mark as Unread

**Cmd/Ctrl+W**: Close selected tab

**Cmd/Ctrl+Y**: Fork selected session

**Cmd/Ctrl+/**: Toggle zen mode

**/**: shows autocomplete of slash commands in the composer
