# Switcheroo

An agentic development environment that attempts to spark joy in your everyday coding:
- The user message & final assistant message are the only messages shown in the main content area.  Most of the time, seeing the tool calls & other events are unnecessary.  You can always open them by right clicking on the message and selecting turn details.
- Each session on the left sidebar shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and it can be multiline as well.  If you supply URLs, they will be linked as well so you can stuff things into it like issue/PR URLs, etc.
- Project management is having a prefix to define what project you're on.  Pinning sessions will put them at the top of the list, and once you're done, unpin and they will slowly float down.  There are multiple ways to find them later on (find in turn details, session or history).
- Sending new messages while the agent is already in progress should always steer where available, otherwise queue.  Claude Code & Codex steer.  Cursor & Pi queue (due to lack of support for steering in their ACP implementation).  But in general, I think the concept of queueing should just go away and every coding agent should always steer.
- All agents are started in bypass permissions/YOLO mode.  Use a sandbox if you're worried about
- Zen mode hides the message type & timestamps.  It's on by default.  You can always turn it off to see those details as needed with Command/Control + /.

- Best paired with [beaver](https://github.com/khooeee/beaver/)

There are also speed optimizations to eliminate unnecessary waiting:
- Pre-warmed session pool so time to first prompt is very fast
- Find in history is a streaming search and has been load tested on a large history.

There's also some niceties:
- Copy message or copy individual code blocks
- Save message or session as Markdown
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

## Develop

```bash
npm install
npm start
```

## Usage

1. Click **+** to create a session.
2. Ticking **Switcheroo aware** will inject a prompt at the beginning of the session which will allow that session to create & control other sessions in Switcheroo.

## Crons

Click the Settings button on the bottom left and select **Open Crons** to edit `crons.json`. Each enabled cron starts a new unpinned session in the background and sends its prompt. Changes apply as soon as you save.

```json
{
  "crons": [
    {
      "title": "Standup YYYY-MM-DD",
      "agent": "claude",
      "cron": "0 9 * * 1-5",
      "cwd": "~/code/my-project",
      "prompt": "Summarize yesterday's commits.",
      "enabled": true,
      "switcherooAware": false
    }
  ]
}
```

- `cron` is a standard 5-field expression in local time: `minute hour day-of-month month day-of-week` (e.g. `*/15 * * * *` is every 15 minutes, `0 9 * * 1-5` is 9:00 on weekdays). Numbers, `*`, ranges, steps and lists are supported; names like `MON` are not.
- `agent` is one of `claude`, `codex`, `cursor` or `pi`.
- `enabled` must be `true` to run; a missing `enabled` is off.
- `title` is optional; `YYYY-MM-DD`, `HH:MM` and `H:MM` in it become the run's local date and 24-hour time.
- Crons only run while Switcheroo is open. Runs missed while the app was closed or the computer was asleep are skipped.

## History management

It's likely you don't have to read this section ever, but it's here in case the app gets slow.

- If the session is slow due to a long transcript, you should just start a new session.
- The session list is capped to 500 on app startup and whenever a session is created (can be edited via `settings.sessionListMax`).  Overflow unpinned sessions are closed first (still on disk; pinned sessions count toward the cap).  Sessions that are running are never closed this way.  You can still find closed sessions through "Find in History".
- If you're running out of disk space, click on Settings button on bottom left, select "Open Sessions Folder" and then archive/delete as you wish (folder names are prefixed with YYYY-MM-DD which is when those sessions started).  Keep in mind those sessions might still show up in your session list until you click them.  Only then will the app check its existence and remove it from the list if it doesn't exist anymore.  This was done to avoid extra checks in the app to maximize app performance.

## Shortcuts

**Ctrl+A**: Go to beginning of prompt

**Ctrl+D**: Close session on empty prompt

**Cmd+F**: Find in current session

**Cmd+Shift+F**: Find in History (searches all sessions on disk)

**Cmd+G**: Focus on filter tabs

**Cmd+I**: Focus on prompt

**Cmd+N**: New session

**Cmd+P**: Pin/unpin selected session

**Cmd+R**: Rename selected tab

**Cmd+U**: Mark as Unread

**Cmd+W**: Close selected tab

**Cmd+Y**: Fork selected session

**Ctrl+Tab**: Go to next visible tab

**Ctrl+Shift+Tab**: Go to previous visible tab

**Escape**: Stop agent (while running)

**Cmd+/**: Toggle zen mode

**/**: shows autocomplete of slash commands in the composer
