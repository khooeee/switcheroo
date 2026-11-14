# Switcheroo

An agentic development environment that sparks joy in my everyday coding:
- The user message & final assistant message are the only messages shown in the main content area.  Most of the time, seeing the tool calls & other events are unnecessary.  You can always open them by right clicking on the message and selecting turn details.
- Each session on the left sidebar shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and it can be multiline as well.  If you supply URLs, they will be linked as well so you can stuff things into it like issue/PR URLs, etc.
- Pinning sessions will put them at the top of the list, and once you're done, unpin and they will eventually float down.  You can find them later on through find in history.
- Sending new messages while the agent is already in progress should always steer where available, otherwise queue.  Claude Code & Codex steer.  Cursor & Pi queue (due to lack of support for steering in their ACP implementation).  But in general, I think the concept of queueing should just go away and every coding agent should always steer.
- All agents are started in bypass permissions/YOLO mode.
- You can go back and forward through the sessions you selected.  As an example of how I use this, I do something similar to `/btw` by forking a session, sending a prompt and then going back to the original session to keep on working.
- Zen mode hides the message type & timestamps.  It's on by default.  You can always turn it off to see those details as needed with Command/Control + /.
- You can control your sessions through an iOS app.
- Best paired with [beaver](https://github.com/khooeee/beaver/)

There are also orchestration features:
- Sessions can drive each other: create other sessions, rename them, send prompts to them, wait for & read their replies, and close them.  In other words, pretty much everything session-specific aside from forking.  This can lead to very useful parallelization strategies (e.g. reading GitHub issues & implementing them in parallel).  Every session gets these as tools from Switcheroo's own MCP server, so it works the same for Claude Code, Codex, Cursor & Pi.
- A hands-free voice agent ([Inworld Realtime](https://docs.inworld.ai/realtime/overview)) controls every session: ask what's running, send or steer prompts, start new sessions, and hear finished turns announced.  It also answers general questions and searches the web.  Click the mic in the bottom left to start it; add your Inworld API key under **Voice** → **Open Settings**.

## Install (macOS)

Download `Switcheroo-*-arm64.dmg` from the latest [GitHub Release](https://github.com/khooeee/switcheroo/releases). Apple Silicon (M1 onwards) only.

Open the `.dmg`, drag **Switcheroo** into Applications, then launch it.

Builds are not notarized. On first open, macOS says it can't verify the app. Go to **System Settings** → **Privacy & Security** and click **Open Anyway**, or clear quarantine:

```bash
xattr -cr /Applications/Switcheroo.app
```

## Install (Ubuntu)

Download `switcheroo_*_amd64.deb` from the latest [GitHub Release](https://github.com/khooeee/switcheroo/releases), then install it:

```bash
sudo apt install ./switcheroo_*_amd64.deb
```

## Prerequisites

At least one agent CLI installed and authenticated. The Claude Code, Codex, and Pi ACP adapters ship with the app, but every agent runs on your own installed CLI:

- **Claude Code**: `claude` on `PATH` (e.g. `brew install --cask claude-code`) and Claude login or `ANTHROPIC_API_KEY`
- **Codex**: `codex` on `PATH` (e.g. `brew install --cask codex`) and Codex/ChatGPT login or `OPENAI_API_KEY` / `CODEX_API_KEY`
- **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`
- **Pi**: `pi` on `PATH` via `npm install -g @earendil-works/pi-coding-agent`

`PATH` here means your terminal's `PATH`. On startup Switcheroo runs your login shell once (`$SHELL -i -l`), so agents get the same environment as a new terminal window, even when you open the app from the Dock. While it runs, `SWITCHEROO_RESOLVING_SHELL_ENV=1` is set, so your rc files can skip slow steps. If the shell fails or takes more than 10 seconds, agents use Switcheroo's own environment plus common bin dirs. After editing rc files, restart Switcheroo.

## Develop

```bash
npm install
npm start
```

## Crons

Click the Settings button on the bottom and select **Open Crons** to edit `crons.json`. Each enabled cron starts a new unpinned session in the background and sends its prompt. Changes apply as soon as you save `crons.json`.

```json
{
  "crons": [
    {
      "title": "Standup YYYY-MM-DD",
      "agent": "claude",
      "cron": "0 9 * * 1-5",
      "cwd": "~/code/my-project",
      "prompt": "Summarize yesterday's commits.",
      "enabled": true
    }
  ]
}
```

- `cron` is a standard 5-field expression in local time: `minute hour day-of-month month day-of-week` (e.g. `*/15 * * * *` is every 15 minutes, `0 9 * * 1-5` is 9:00 on weekdays). Numbers, `*`, ranges, steps and lists are supported; names like `MON` are not.
- `agent` is one of `claude`, `codex`, `cursor` or `pi`.
- `enabled` must be `true` to run; a missing `enabled` is off.
- `title` is optional; `YYYY-MM-DD`, `HH:MM` and `H:MM` in it become the run's local date and 24-hour time.
- Crons only run while Switcheroo is open. Runs missed while the app was closed or the computer was asleep are skipped.

## Reminders

Ask any session to remind you of something ("remind me to check the deploy in 20 minutes"). Agents set reminders with the `set_reminder` tool from Switcheroo's MCP server, and can list and cancel them too. The voice agent can as well; its reminders link to the session you name, else the one you're talking about or the one on screen. With no session open, it starts one and has it set the reminder. When one is due, Switcheroo shows a desktop notification and plays a short chime (unless sounds are off in settings); clicking it opens the session that set it. If voice is on, it reads the reminder out instead of chiming. The reminder also appears in that session's transcript as a "Reminder" row, so you can see it when you return to the session. Reminders are for you: they never send a prompt to a session, and the agent never sees the row.

Pending reminders live in `reminders.json`. Click the Settings button on the bottom and select **Open Reminders** to view or edit it; changes apply as soon as you save.

```json
{
  "reminders": [
    {
      "id": "a1b2c3d4",
      "dueAt": "2026-11-13T15:00:00-08:00",
      "message": "Check the deploy",
      "sessionId": "2026-11-13-..."
    }
  ]
}
```

- `dueAt` is ISO 8601; without an offset it is local time.
- `sessionId` is optional; without it, the notification just brings Switcheroo to the front.
- Each reminder fires once and is then removed. One that came due while Switcheroo was closed or the computer was asleep fires late, as soon as Switcheroo is running again.
- macOS only shows notifications for properly code-signed apps, so Switcheroo builds show a small Switcheroo popup in the top-right corner instead. It stays until you click it (opens the session) or dismiss it, and never takes focus.

## iOS app

`ios/` is an iOS client that lets you interact with your sessions over [Tailscale](https://tailscale.com). Switcheroo only listens on localhost; `tailscale serve` publishes it to your tailnet over HTTPS.

Initial setup
1. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), turn on MagicDNS and HTTPS certificates.
2. Build the app on iOS: `brew install xcodegen`, then `npm run ios` and open `ios/Switcheroo.xcodeproj`. To run on a device, put `DEVELOPMENT_TEAM = <your team id>` in `ios/Config/Local.xcconfig`.

Switcheroo desktop app
3. If using a MacBook, plug it in.
4. Keep lid open (unless an external display is connected).
5. Run `caffeinate -ims` to keep it awake.
6. In Switcheroo desktop app, open **Settings** and tick **Allow the iOS app over Tailscale**.
7. Run the provided command which should look similar to `tailscale serve --bg <port>`.
8. Click **Copy iOS Link** & paste the link into the iOS app.

The phone uses the localhost control API, on a fixed port (7389 by default) that also serves Switcheroo's MCP server to sessions. Unticking the checkbox only refuses requests that come through Tailscale; sessions keep their MCP tools. Tailscale Funnel (public internet) traffic is always refused. The iOS token stays the same across launches. To revoke it, click **Rotate Token** in **Settings** and pair again. Scripts on the Mac use a separate token from `~/.switcheroo/control.json`, which is new every launch and refused over Tailscale; sessions have their own MCP keys. Neither is affected by rotating.

## History Management

It's likely you don't have to read this section ever, but it's here in case your app gets slow.

- If the session is slow due to a long transcript, you should just start a new session.
- The session list is capped to 500 on app startup and whenever a session is created (can be edited via `settings.sessionListMax`).  The oldest sessions are removed from the list but are still on disk.  You can still find these sessions through "Find in History".
- If you're running out of disk space, click on Settings button on the bottom, select "Open Sessions Folder" and then archive/delete folders as you wish (folder names are prefixed with YYYY-MM-DD which is when those sessions started).  Keep in mind those sessions might still show up in your session list until you click them.  Only then will the app check its existence and remove it from the list if it doesn't exist anymore.  This was done to avoid extra checks in the app to maximize app performance.

## Inworld Model Research

```
inworld/models/gemma-4-26b-a4b-it
# under 0.15s TTFT, 237 tok/s, $0.07 input, $0.34 output

inworld/models/mimo-v2.6-pro
# under 0.18s TTFT, 273 tok/s, $0.43 input, $0.87 output
```

See [Inworld's list of models](https://inworld.ai/models).

For intelligence comparisons, see [Artificial Analysis](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index?models=mimo-v2-6-pro%2Cgemma-4-31b%2Cglm-5-3-flash%2Cdeepseek-v4-1-flash-1017-non-reasoning%2Cdeepseek-v4-1-flash-1017%2Cdeepseek-v4-1-flash-1017-high).

## Features

Speed optimizations:
- Pre-warmed session pool so time to first prompt is very fast
- Find in history is a streaming search that is performant even with a large history.

Niceties:
- Copy message or copy individual code blocks
- Save message or session as Markdown
- Preview Markdown files like how they would appear in GitHub
- [Reminders](#reminders) that agents or voice can set for you, with a popup, chime and transcript note when due

## Shortcuts

**Ctrl+D**: Close session on empty prompt

**Cmd/Ctrl+F**: Find in current session

**Cmd/Ctrl+Shift+F**: Find in History (searches all sessions on disk)

**Cmd/Ctrl+G**: Focus on filter tabs

**Cmd/Ctrl+I**: Focus on prompt

**Cmd/Ctrl+N**: New session

**Cmd/Ctrl+P**: Pin/unpin selected session

**Cmd/Ctrl+R**: Rename selected tab

**Cmd/Ctrl+U**: Mark as Unread

**Cmd/Ctrl+W**: Close selected tab

**Cmd/Ctrl+Y**: Fork selected session

**Ctrl+Tab**: Go to next visible tab

**Ctrl+Shift+Tab**: Go to previous visible tab

**Alt+Left or Cmd+[**: Go back to the previously selected tab

**Alt+Right or Cmd+]**: Go forward through selected tabs

**Escape**: Stop agent (while running)

**Cmd/Ctrl+/**: Toggle zen mode

**Cmd/Ctrl+,**: Open settings

**/**: shows autocomplete of slash commands in the composer
