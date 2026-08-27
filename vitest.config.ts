import { defineConfig } from "vitest/config";

// Each entry is a package directory with its own vitest.config.ts.
// apps/web isn't listed yet — no component tests exist. When that changes,
// add "apps/web" here plus jsdom + @testing-library/react as devDependencies
// and a test.environment: "jsdom" override in apps/web/vitest.config.ts.
//
// Testing priority going forward: prioritize deterministic, non-LLM logic in
// the worker pipeline (ad dedup, staleness marking, User-Ad-Status derivation
// — "new" as absence of a status row — and other plain code/DB-query logic).
// LLM-call logic (matching, scoring, drafting) and UI components are lower
// priority at this stage. Add tests opportunistically as that code is
// written or touched, not as a backfill exercise.
export default defineConfig({
  test: {
    projects: ["apps/worker", "packages/shared"],
  },
});
