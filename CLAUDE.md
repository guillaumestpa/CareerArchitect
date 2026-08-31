# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Career Architect — a single-user prototype that monitors target companies' career pages, scores new job ads against a structured user profile, and drafts a tailored resume/cover letter per ad. pnpm monorepo, Node 22, TypeScript, Next.js 16 + Supabase (Postgres).

**Current state: scaffolding + database schema only.** No feature logic (profiling, scraping, matching, drafting) exists yet. Everything in `packages/shared/src/types/` other than `database.types.ts` is a hand-written stub.

[docs/career-engineer-project-state-26082026.md](docs/career-engineer-project-state-26082026.md) is the product spec and decision log — it records confirmed decisions, *and* the explicitly rejected and deferred alternatives with reasons. Read the relevant section before designing anything; proposing a rejected option (autonomous submission, a swarm of autonomous agents, SQLite, front-loaded onboarding elicitation) means re-arguing a settled decision.

## Commands

Run from the repo root:

```bash
pnpm dev                       # Next.js dev server (apps/web) on :3000
pnpm build                     # build every workspace
pnpm lint                      # eslint across workspaces
pnpm typecheck                 # tsc --noEmit across workspaces
pnpm test                      # vitest run (apps/worker + packages/shared)
pnpm --filter worker start     # run the worker entrypoint once (tsx src/index.ts)
```

Targeting one workspace or one test:

```bash
pnpm --filter @career-architect/worker exec vitest run src/supabase-connection.test.ts
```

```bash
pnpm test -- -t "rejects a bogus key"
```

Schema work (the Supabase CLI is a root dev dependency, so `pnpm supabase ...` uses the pinned version):

```bash
pnpm supabase migration new <name>
```

```bash
pnpm supabase db push
```

```bash
pnpm supabase gen types typescript --linked > packages/shared/src/types/database.types.ts
```

A fresh clone must run `pnpm supabase link` first: `supabase/config.toml` is still the untouched placeholder (`project_id = "career-architect"`), and the real project ref lives only in the gitignored `supabase/.temp/`.

## Architecture

### Workspaces

```
apps/web/         Next.js 16 app — UI plus API routes reacting to live user actions
apps/worker/      Scheduled monitoring/scraping cycle, run by .github/workflows/worker.yml
packages/shared/  Domain types shared by both (raw .ts, no build step)
packages/config/  Shared tsconfig/eslint bases, consumed via workspace exports
```

`web` and `worker` both depend on `shared`; nothing depends on them. `shared` has no runtime dependencies and must stay that way — it is imported into both a browser bundle and a Node worker.

### The two write paths

The central structural decision: writes come from two independent triggers, not one pipeline.

1. **Worker cycle (scheduled)** — sourcing, ad dedup, staleness marking. Writes the global `ads` table. Staleness is source-health-gated: only mark an ad stale if that company's connector *passed* its health check this run, otherwise flag the source unhealthy and preserve last-known state.
2. **Web API routes (live user action)** — `user_ad_status` rows. Deliberately *not* part of the worker pipeline.

`user_ad_status` is sparse: a row exists only after the user interacts with an ad, so "new" is a **derived absence** (ads for monitored companies minus ads carrying a status row). Never introduce a materialized queue that accumulates and clears — that model was rejected.

### Code vs. AI split

"Code handles retrieval. AI handles reasoning." Connectors, dedup, staleness, frequency thresholds, and gap detection are plain code/DB queries. LLM calls are reserved for judgment and generation (matching, analysis, drafting, phrasing elicitation questions, structuring free-text answers back into the schema). Reserve the word "Agent" in names for stages where an LLM does real work; deterministic pipeline steps do not get that label even when they sit in the same cycle.

### Database

`supabase/migrations/20260831073434_initial_career_engineer_schema.sql` is the authoritative schema (6 enums, 2 trigger functions, 14 tables) and applies to the linked remote project — there is no local Supabase stack in use. Invariants worth knowing before touching writes:

- `updated_at` is owned by the DB (`set_updated_at` trigger). Application code never writes it.
- Each `capital_*` table pairs `provenance` with exactly one evidence column — `evidence_ad_id` for `ad_confirmed`, `evidence_category` otherwise — enforced by a CHECK.
- `initial_content` on the draft tables is write-once, enforced by the `prevent_initial_content_update` trigger.
- **No RLS policies exist yet.** Every table will be flagged by the Supabase linter; that is known and deferred, not an oversight to fix in passing.

Two parallel type sets currently coexist: generated `database.types.ts` (not re-exported from `packages/shared/src/index.ts`, so nothing consumes it yet) and the hand-written stub interfaces that *are* exported. Retiring the stubs is a pending decision — don't silently delete either set.

### Environment and secrets

All three Supabase variables live in one gitignored `.env` at the repo root (not per-app). `apps/worker/src/supabase-env.ts` validates them strictly and is the only place that reads `process.env` for them:

- `requireServerEnv()` (url + service key) vs `requireSupabaseEnv()` (all three) exist because the worker never uses the client key and `worker.yml` does not supply it. Keep that split.
- The load-bearing guard is the key-tier check: `NEXT_PUBLIC_*` is inlined into the browser bundle, so a swapped pair would publish the service-role key to every visitor.
- Error messages and test assertions must never contain a key's value — Vitest prints received values on failure, and those logs get pasted around. Assert on derived descriptors (shape, status, boolean) only.

## Conventions

- `apps/worker` and `packages/shared` are NodeNext ESM: **relative imports need the `.js` extension** even in TypeScript (`./supabase-env.js`). `apps/web` uses bundler resolution and does not.
- `packages/shared` ships raw `.ts` (its `main` points at `src/index.ts`), which is why `apps/web/next.config.ts` lists it in `transpilePackages`.
- `apps/web/AGENTS.md` (loaded via `apps/web/CLAUDE.md`) is generated by `next dev` and warns that this Next.js version differs from training data — read `node_modules/next/dist/docs/` before writing Next code, and commit that block rather than stripping it from diffs.
- Testing priority, per the comment in [vitest.config.ts](vitest.config.ts): deterministic non-LLM worker logic first (dedup, staleness, status derivation). LLM-call logic and UI components are lower priority; `apps/web` is intentionally absent from the `projects` list until component tests justify adding jsdom.
- `apps/worker` tests make **real network calls** to the live Supabase project — hence the 20s timeout and one retry in `apps/worker/vitest.config.ts`, and `vitest.setup.ts` loading the repo-root `.env` explicitly (Vitest resolves `.env` per project root, not repo root). `pnpm test` fails without a filled `.env` and network access.

## Known environment gotcha

If Vitest dies at startup with `Cannot find native binding` for rolldown, check whether the OS blocked the `.node` file before reinstalling dependencies:

```bash
node -e "require('./node_modules/.pnpm/@rolldown+binding-win32-x64-msvc@1.2.6/node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node')"
```

An "Application Control policy has blocked this file" error there is a Windows/sandbox restriction — the package is correctly installed and linked, and reinstalling will not fix it.
