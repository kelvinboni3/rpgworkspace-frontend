import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io", ".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://localhost:5069",
        changeOrigin: true,
      },
    },
  },
  // `vite preview` (production build) doesn't inherit `server.proxy` — without this, /api calls
  // 404 on the preview server since VITE_API_BASE_URL is the relative "/api" in .env.
  preview: {
    proxy: {
      "/api": {
        target: "http://localhost:5069",
        changeOrigin: true,
      },
    },
  },
});
