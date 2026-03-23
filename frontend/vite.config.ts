import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["filehistory.jvfont.site"],
    hmr: {
      host: "filehistory.jvfont.site",
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": { target: "http://jfile-backend:8000", changeOrigin: true },
      "/covers": { target: "http://jfile-backend:8000", changeOrigin: true },
      "/pages": { target: "http://jfile-backend:8000", changeOrigin: true },
      "/uploads": { target: "http://jfile-backend:8000", changeOrigin: true },
    },
  },
});
