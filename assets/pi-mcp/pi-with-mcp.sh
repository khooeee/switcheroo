#!/bin/sh
# pi-acp runs this in place of `pi` (PI_ACP_PI_COMMAND) so Pi loads the extension that
# registers the session's ACP mcpServers; pi-acp itself accepts them but never passes them on.
exec "${SWITCHEROO_PI_COMMAND:-pi}" -e "$(dirname "$0")/register-mcp-servers.js" "$@"
