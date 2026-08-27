# Career Architect

A web app that automates job-search grunt work: build a structured profile from your
CV/LinkedIn, monitor target companies' career pages, score and shortlist new job ads
against your profile, and draft a tailored resume + cover letter once you pick one to
pursue. Full product concept and decision log: [docs/career-engineer-project-state-26082026.md](docs/career-engineer-project-state-26082026.md).

This is a personal prototype (single user) with an eye toward a small (5–20 user) MVP
later — see that doc's "Platform & goal of v1" section.

## Repo layout

This is a pnpm monorepo:

```
apps/
  web/      Next.js app (frontend + API routes) — what you interact with day-to-day
  worker/   Background monitoring/scraping worker, run on a schedule via GitHub Actions
packages/
  shared/   Cross-cutting TypeScript types shared between web and worker
  config/   Shared tsconfig/eslint base config
supabase/   Supabase CLI project (migrations live here)
```

## First-time setup

1. **Install Node** — version pinned in [.nvmrc](.nvmrc). If you use `nvm`, run `nvm use`.
2. **Install pnpm** (if you don't have it):
   ```bash
   npm install -g pnpm
   ```
3. **Install dependencies** from the repo root:
   ```bash
   pnpm install
   ```
4. **Set up environment variables** — copy the example file and fill in real values once
   you've created a Supabase project (and picked an LLM provider):
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
     — from your Supabase project's **Settings > API** page.
   - `LLM_API_KEY` — provider not yet decided (see project state doc, Open Questions).

## Everyday commands

Run from the repo root:

```bash
pnpm dev         # start the Next.js app (apps/web) in dev mode
pnpm build       # build all packages/apps
pnpm lint        # lint all packages/apps
pnpm typecheck   # type-check all packages/apps
```

To run just the worker's placeholder entrypoint locally:

```bash
pnpm --filter worker start
```

## Status

Structural scaffolding only — no feature logic (profiling, matching, scraping, drafting)
is implemented yet. Next steps are tracked in the project state doc's "Current Focus"
and "Open Questions" sections.
