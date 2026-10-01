import { defineConfig } from "vite";

/** Keep adapters on disk for `node <bin>` spawns — do not bundle them into main. */
const agentAdapters = [
  "@agentclientprotocol/claude-agent-acp",
  "@agentclientprotocol/codex-acp",
  "pi-acp",
];

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["electron", ...agentAdapters],
    },
  },
});
