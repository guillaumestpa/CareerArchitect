import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Loads the repo-root .env; see the setup file for why it's not automatic.
    setupFiles: ["./vitest.setup.ts"],
    // The Supabase connection tests make real network round-trips to the
    // project's region, which the 5s default is too tight for on a cold start.
    testTimeout: 20_000,
    // One retry absorbs a transient DNS/network blip on those live calls. The
    // deterministic tests fail identically on a retry, so nothing is masked.
    retry: 1,
  },
});
