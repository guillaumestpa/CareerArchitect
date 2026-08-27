import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Vitest resolves .env files relative to each project root — which for this
// project is apps/worker/, not the monorepo root. Secrets live in a single
// gitignored .env at the repo root, so load it explicitly.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
