# Pi and ACP `mcpServers`

Every Switcheroo session gets Switcheroo's own MCP server (`POST /mcp/:sessionId` on the control server) through ACP's `mcpServers`. Claude, Codex and Cursor honour it. Pi needs a workaround, because `pi-acp` drops the servers.

## The gap

`pi-acp` 0.0.34 accepts `mcpServers` on `session/new`, `load` and `resume`, then stores them on its session object (`this.mcpServers = opts.mcpServers`) and never reads them again. Pi itself supports MCP; it just never hears about the servers.

Two things `pi-acp` does make a workaround possible without patching it:

- It runs Pi as `$PI_ACP_PI_COMMAND --mode rpc --no-themes [--session …]`, so the Pi command is swappable.
- It spawns Pi with `env: process.env`, so whatever environment Switcheroo gives `pi-acp` reaches Pi.

Switcheroo runs one `pi-acp` process per session, so environment variables are per session too.

## How it works

1. `connectAcpAgent` adds `piMcpEnv(agent, mcpServers)` to the spawn environment. For Pi with servers, that is:
   - `PI_ACP_PI_COMMAND`: our wrapper, `pi-mcp/pi-with-mcp.sh`.
   - `SWITCHEROO_PI_COMMAND`: the real Pi command (the user's own `PI_ACP_PI_COMMAND`, else `pi`).
   - `PI_ACP_MCP_SERVERS`: the session's ACP `mcpServers` as JSON.
2. `pi-acp` runs the wrapper in place of Pi. The wrapper `exec`s the real Pi with `-e register-mcp-servers.js`, passing `pi-acp`'s arguments through.
3. The extension reads `PI_ACP_MCP_SERVERS` and deletes it, so Pi's shell commands never see the session's MCP key. It turns ACP's `{name, value}` lists into records and calls `pi.registerMcpServer(name, {url, headers} | {command, args, env}, exposure: "direct")` for each server. Pi then lists them as ordinary tools, such as `mcp__switcheroo__list_sessions`.

With no servers (the control server is off), `piMcpEnv` returns `{}` and `pi-acp` runs plain Pi. Pi cannot fork, so forks never need this.

## Files

| File | Role |
|---|---|
| `src/main/acp/piMcpEnv.ts` | Builds the three variables and finds `pi-mcp` (packaged `Resources/pi-mcp`, else `assets/pi-mcp`). |
| `src/main/acp/connectAcpAgent.ts` | Merges them into the agent's spawn environment. |
| `assets/pi-mcp/pi-with-mcp.sh` | Wrapper that `pi-acp` runs as Pi. Must stay executable. |
| `assets/pi-mcp/register-mcp-servers.js` | Pi extension that registers the servers. |
| `forge.config.ts` | Ships `assets/pi-mcp` as an `extraResource`, outside the asar, because `pi-acp` and Pi need real files on disk. |

## What can break it

It leans on `pi-acp` and Pi behaviour, not on any contract:

- `pi-acp` stops reading `PI_ACP_PI_COMMAND` or stops passing its environment on to Pi.
- Pi changes the `-e` flag or `pi.registerMcpServer`'s signature or options (tested with Pi 1.5.0).
- Pi's default 60 s MCP tool timeout. `wait_for_sessions` caps at 45 s to stay under it (Codex has the same limit).

If Pi sessions lose Switcheroo's tools after a `pi-acp` or Pi upgrade, check these first.

## Testing

Create a Pi session and ask it: "Call the switcheroo list_sessions tool. Reply with only the id of the entry marked self." The reply should be that session's Switcheroo id. In a packaged build, `Switcheroo.app/Contents/Resources/pi-mcp/pi-with-mcp.sh` should exist and be executable.

## Removing it

Once `pi-acp` forwards `mcpServers` to Pi (for example, `grep -n "\.mcpServers" node_modules/pi-acp/dist/index.js` shows them being used rather than only stored), delete `piMcpEnv.ts` and its call in `connectAcpAgent.ts`, `assets/pi-mcp`, the `extraResource` entry, and this doc. Then rerun the test above.
