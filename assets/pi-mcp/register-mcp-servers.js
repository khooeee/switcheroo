// Pi extension: registers the ACP `mcpServers` Switcheroo passes in PI_ACP_MCP_SERVERS for this session.
const toRecord = (list = []) => Object.fromEntries(list.map(({ name, value }) => [name, value]));

export default function registerMcpServers(pi) {
  const raw = process.env.PI_ACP_MCP_SERVERS;
  if (!raw) return;
  // Keep the servers' credentials out of the shell commands Pi runs.
  delete process.env.PI_ACP_MCP_SERVERS;
  for (const server of JSON.parse(raw)) {
    const transport = "url" in server
      ? { url: server.url, headers: toRecord(server.headers) }
      : { command: server.command, args: server.args ?? [], env: toRecord(server.env) };
    pi.registerMcpServer(server.name, { ...transport, exposure: "direct" });
  }
}
