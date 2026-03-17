import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-router-dom")) {
            return "router";
          }

          if (id.includes("socket.io-client")) {
            return "socket";
          }

          if (id.includes("@google/generative-ai")) {
            return "ai";
          }

          if (id.includes("mammoth")) {
            return "doc-tools";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
