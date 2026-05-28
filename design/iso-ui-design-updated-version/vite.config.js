import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /auth, /profiles, /formats, /rules, /validate,
      // /history, /audit, /ai, /users, /config to API gateway
      "/auth":             { target: "http://localhost:8080", changeOrigin: true },
      "/profiles":         { target: "http://localhost:8080", changeOrigin: true },
      "/formats":          { target: "http://localhost:8080", changeOrigin: true },
      "/rules":            { target: "http://localhost:8080", changeOrigin: true },
      "/field-definitions":{ target: "http://localhost:8080", changeOrigin: true },
      "/validate":         { target: "http://localhost:8080", changeOrigin: true },
      "/history":          { target: "http://localhost:8080", changeOrigin: true },
      "/audit":            { target: "http://localhost:8080", changeOrigin: true },
      "/ai":               { target: "http://localhost:8080", changeOrigin: true },
      "/users":            { target: "http://localhost:8080", changeOrigin: true },
      "/config":           { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:     ["react", "react-dom"],
          router:     ["react-router-dom"],
          http:       ["axios"],
        },
      },
    },
  },
});