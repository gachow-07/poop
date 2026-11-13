import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build --mode artifact` produces one self-contained HTML file for a Claude artifact,
// where meal generation runs through the artifact's built-in Claude access.
// Every other mode is a normal web build that calls the /api/ai server (server/index.ts).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "artifact" ? [viteSingleFile()] : [])],
  define: {
    "import.meta.env.VITE_AI_MODE": JSON.stringify(mode === "artifact" ? "artifact" : "server"),
  },
  build: { outDir: mode === "artifact" ? "dist-artifact" : "dist" },
  server: { proxy: { "/api": "http://localhost:8787" } },
}));
