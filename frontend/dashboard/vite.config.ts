import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Keep the browser's Host (including its port). Replacing it with the internal
  // target makes same-origin POSTs appear cross-origin to Spring's CORS checks.
  server: { proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: false } } },
});
