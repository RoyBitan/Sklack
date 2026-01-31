/// <reference types="vitest" />
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      // כאן הוספנו את התיקון עבור ngrok
      allowedHosts: [
        "sinistrogyric-souplike-mari.ngrok-free.dev",
      ],
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 3000,
      },
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@/features": path.resolve(__dirname, "./src/features"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
        "@/services": path.resolve(__dirname, "./services"),
        "@/components": path.resolve(__dirname, "./components"),
        "@/contexts": path.resolve(__dirname, "./contexts"),
        "@/utils": path.resolve(__dirname, "./utils"),
        "@/types": path.resolve(__dirname, "./types.ts"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./tests/setup.ts",
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  };
});
