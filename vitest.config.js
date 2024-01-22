import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    environment: "node",
    // setupFiles: ["src/setupTests.ts"],
  },
});