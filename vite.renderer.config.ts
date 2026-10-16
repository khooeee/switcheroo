import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // No live reload: renderer HMR off, and no websocket so preload rebuilds can't trigger a full reload.
  server: { hmr: false, ws: false },
});
