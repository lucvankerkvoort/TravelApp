import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, ".."),
  plugins: [react(), cesium()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
});
