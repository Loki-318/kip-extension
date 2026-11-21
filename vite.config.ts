import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    // Extension pages (chrome-extension://...) have no relation to
    // localhost:5173 in their origin, so Vite's HMR client can't infer
    // the dev server's host/port automatically the way it would on a
    // normal webpage. Without this, the HMR websocket falls back to
    // ws://localhost/ (default port 80) and fails to connect.
    hmr: {
      host: "localhost",
      port: 5173,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});