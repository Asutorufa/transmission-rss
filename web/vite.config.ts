import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  build: { outDir: "out", emptyOutDir: true },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:9093",
      "/start_job": "http://127.0.0.1:9093",
    },
  },
});
