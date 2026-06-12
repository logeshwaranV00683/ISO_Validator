import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // FIX: Only proxy paths that start with these exact segments
      // AND are clearly API calls (not page routes).
      // Using regex-based proxy with stricter matching:

      // /auth/... → backend (login, logout, change-password etc.)
      "^/auth/":             { target: "http://localhost:8080", changeOrigin: true },

      // /profiles/... → backend
      "^/profiles/":         { target: "http://localhost:8080", changeOrigin: true },

      // /formats/... → backend
      "^/formats/":          { target: "http://localhost:8080", changeOrigin: true },

      // /rules/... → backend (only /rules/something, NOT /rules page itself)
      // FIX: /rules alone (page route) was being proxied to backend!
      "^/rules/":            { target: "http://localhost:8080", changeOrigin: true },

      // /field-definitions/... → backend
      "^/field-definitions/":{ target: "http://localhost:8080", changeOrigin: true },

      // /validate/... → backend
      "^/validate/":         { target: "http://localhost:8080", changeOrigin: true },

      // /history/... → backend
      "^/history/":          { target: "http://localhost:8080", changeOrigin: true },

      // /audit/... → backend
      "^/audit/":            { target: "http://localhost:8080", changeOrigin: true },

      // /ai/... → backend
      "^/ai/":               { target: "http://localhost:8080", changeOrigin: true },

      // /users/... → backend
      "^/users/":            { target: "http://localhost:8080", changeOrigin: true },

      // /config/... → backend
      "^/config/":           { target: "http://localhost:8080", changeOrigin: true },
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