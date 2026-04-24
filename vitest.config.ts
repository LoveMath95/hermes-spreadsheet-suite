import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  server: {
    host: "127.0.0.1"
  },
  resolve: {
    alias: {
      "@hermes/contracts": path.resolve(__dirname, "packages/contracts/src/index.ts")
    }
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "services/**/*.test.ts",
      "extensions/**/*.test.ts"
    ],
    environment: "node"
  }
});
