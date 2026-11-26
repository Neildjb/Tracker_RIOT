import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Le frontend ne parle qu'au backend local (/api). La clé Riot ne transite jamais côté client.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: `http://localhost:${process.env.API_PORT ?? 3001}`, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ["recharts"], vendor: ["react", "react-dom", "react-router-dom"] } },
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
} as never);
