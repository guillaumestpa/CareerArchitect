# The Career Engineer — Project State

*Last updated: 2026-08-26 (consolidated)*

> **Consolidation note:** This version compresses the reasoning-trail sections from the 2026-08-25 and 2026-08-26 passes (previously three full narrative sections: "Refinement Session Findings," "Problem Framing Stress-Test") into a single "Decision Log." No decisions, rationale, or data were dropped — narrative that repeated what's already stated in "Confirmed Features / Decisions" was cut; anything not captured elsewhere was kept, just shortened. Word count: ~4,100 → ~2,300.

## Product Concept (summary)

A web app that solves job-search overload: instead of the user manually scanning thousands of job ads, the system builds a structured profile of the user, identifies relevant target companies, monitors their job postings automatically, scores/ranks new ads against the user's profile, and — once the user picks an ad they're interested in — generates a tailored resume and cover letter from the user's "professional capital."

**Core loop:**
Profile → Target companies → Monitor career pages → Collect & score ads → Present shortlist → User selects → AI analyzes & explains fit → AI drafts tailored CV/cover letter → User iterates on drafts → User submits externally

**User's only touchpoints:** import profile data, answer clarifying questions, define career direction, select interesting ads, iterate on generated drafts. Everything else is automated.

*(Note: the Problem Framing Stress-Test below found the "overload" framing is stale — see Decision Log, 2026-08-26. The loop above is still accurate; the motivating narrative sentence isn't. Revisit this summary's wording next time the concept doc is touched.)*

---

## Confirmed Features / Decisions

### Data model
- "Professional capital" is structured data (experiences, skills, achievements, projects, education, industries, preferences, evidence), not just a stored CV — reusable asset the AI draws from per application.
- Three-way conceptual split:
  - **Professional Capital** — what the user can credibly do (stable)
  - **Career Target** — what the user wants to do (roles, industries, seniority, location, etc.)
  - **Application Profile** — how the user positions themselves for a specific job

### Profiling
- Import CV + LinkedIn → AI drafts initial profile → AI asks targeted clarifying questions only where there are gaps/ambiguities → user confirms/corrects.
- Principle: don't ask the user for info unless the system has a specific reason to need it.
- **Proactive Elicitation Mode:** a second, additive mode alongside reactive gap-filling, for experience that was never written down anywhere and therefore can't be detected as a "gap" by comparing against an imported document.
  - **No large, upfront/front-loaded elicitation pass.** A "complete profile" is treated as an asymptote, not an achievable state — every new job posting is a fresh probe into undocumented experience, so onboarding's job is cheap triage, not completeness.
  - Prompts accumulate into a **deferred queue**, decoupled from any single application's critical path, and surfaced periodically (e.g., "a few things worth adding this week") rather than interrupting active tasks.
  - Three triggers feed the queue, each carrying a distinct provenance/confidence tag:
    1. **Per-ad reactive gap** — a specific job ad required something not in the profile (highest confidence).
    2. **Aggregate frequency (steady state)** — once sufficient ad history exists, frequency analysis across the user's *own* scraped ad corpus for their target companies (e.g., "40% of PM ads at your target companies mention X") surfaces likely-missing skills. Code-driven and grounded in the user's actual target market — not generic internet advice.
    3. **Cold-start inference** — before sufficient ad history exists, generic internet-informed inference about the target role, clearly flagged low-confidence, used sparingly. Superseded by aggregate frequency once enough ad history accumulates.
  - **Prompt format is targeted**, not open-ended: yes/no + optional elaboration, phrased around a specific evidenced skill/requirement (not "tell me about a time..."). Chosen for lower response friction and because it demonstrates the system understands the target role.
  - **Trigger logic is fully deterministic** ("code handles retrieval") — frequency thresholds, gap detection, and user-initiated requests are plain code/DB queries. The LLM's role is scoped to phrasing the question naturally and structuring the user's free-text answer back into the schema ("AI handles reasoning").
  - Elicited entries should carry a provenance/confidence tag (ad-confirmed / aggregate-inferred / cold-start-inferred / user-volunteered) rather than a single flat "unverified" flag — to be formalized at schema design time.

### Company Scoping
- **MVP company-scoping uses only user-defined filters** (industries, company criteria). The product does not help users discover or surface which dimensions/criteria matter to them — that capability (dimension-surfacing + values-advising, e.g. "here are axes companies vary on: size, funding stage, growth vs. stability — where do you land?") is explicitly deferred to a later version. MVP assumes the user arrives with usable criteria already; it narrows against them, it doesn't help form them.
- **Company scoping/list-generation is a one-shot pass, not a persistent pipeline stage.** Once an initial company list is generated (filtered from the full market via the user's Career Target criteria), the product keeps monitoring that fixed list for job ads — it does not re-run scoping on a recurring basis. Re-scoping only happens if the user manually revisits/edits their filters.
- **Deliberate MVP scope boundary:** this leaves the "pre-scoping" pain — the state before a user has any usable criteria at all (whether experienced as too many undifferentiated options, or as being undirected) — unaddressed for MVP. Justified because the builder is the sole MVP user and already has settled criteria; this justification does not hold once the product has other users who may not have settled criteria yet, and should be revisited before any expansion beyond solo use.

### Job sourcing
- Goal is exhaustive coverage of *companies relevant to a given user*, not exhaustive coverage of the whole job market.
- Layered ingestion approach:
  1. ATS connectors (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, etc.) — start with 3–5 major ones
  2. Career-page technology detection
  3. Controlled scraping for custom/unsupported career pages
  4. Browser-agent fallback — only for difficult cases
  5. Ongoing monitoring/validation that sources still work (**source-level health** — is the scraper/connector itself functioning — distinct from ad-level staleness, see below)
- Architectural principle: **"Code handles retrieval. AI handles reasoning."** Deterministic pipelines/connectors for data collection; LLM calls reserved for judgment and generation tasks.
- **State & Freshness:**
  - **Ads table** (global, shared, worker-written): one row per scraped ad — dedup key, company, first_seen_at, last_seen_at, raw content. Ads accumulate indefinitely; nothing is wiped (email-inbox model, not a queue).
  - **User-Ad-Status table** (sparse, per-user): a row is created only on first user interaction with a given ad. "New" is a **derived absence**, not a stored event — computed as (ads for monitored companies) minus (ads already carrying a status row for that user). No materialized queue to accumulate-and-clear.
  - Status values (minimum): inspected/no further action; inspected + interacted (company/job summary pulled, resume/cover letter drafted); applied; dismissed. *(Whether "applied" needs to be a state distinct from "interacted" — likely yes, since generating a draft ≠ submitting it — to be confirmed at schema design time.)*
  - **Dismissed = pure suppression for MVP, no scoring impact.** No separate table needed — it's a status value like any other; the shortlist query excludes any ad carrying a status row from the "new" view. Full history remains browsable elsewhere (dismissal suppresses from the active shortlist, it doesn't delete or hide the ad structurally). Revisit whether dismissal should feed Job Matching Agent scoring in a future version.
  - **Staleness detection is source-health-gated and sequential** (to avoid confusing "job taken down" with "scraper broke"):
    1. Run the source-health check (layering step 5) for that company's scraper/connector this cycle.
    2. Only if that check passes: an ad's dedup key missing from this run's results → mark that ad stale/taken-down.
    3. If the health check fails or is ambiguous: do not mark any of that source's ads stale — preserve last-known state and flag the *source* as unhealthy instead.
  - This model scales cleanly for multi-user: per-user storage is proportional to *(ads that user actually engaged with)*, not *(total ads scraped)* or *(number of users) × (total ads)*.

### Agentic workflow (conceptual, not yet mapped to code)
Named workflow stages: Profile Agent, Company Discovery Agent, Company Enrichment Agent, Job Discovery Agent, Job Matching Agent, Job Analysis Agent, Application Agent — with a possible future Orchestrator.
MVP should be a small number of deterministic workflows with embedded LLM calls, **not** a swarm of autonomous agents.

- **Ad-lifecycle & state-tracking ownership:** what looked like one concern needing one owner turned out to be two distinct write paths on two different triggers:
  1. **Ad lifecycle tracking** (dedup, staleness marking) — a new, explicitly **non-LLM deterministic pipeline step**, positioned between Job Discovery Agent and Job Matching Agent, running inside the same scheduled worker cycle (required there because staleness marking must be sequenced with that run's source-health check).
  2. **User-Ad-Status tracking** (seen/interacted/applied/dismissed) — **not part of the agent pipeline at all.** Ordinary application backend logic (API routes reacting to live user clicks in the web app), triggered independently of the worker's schedule.
- **Naming convention clarified:** "Agent" is reserved for stages where an LLM performs real judgment/generation work (Matching, Analysis, Application drafting, Enrichment). Deterministic, code-only steps — like the ad-lifecycle step — should not be labeled "Agent" even when they sit inside the same pipeline.
- **Company Enrichment Agent:** a distinct pipeline stage generating deep company research (market, trends, competitive position, why the company needs this role now) **once per company**, stored and reused across every application to that company rather than regenerated per job ad. Directly targets the 1–2h tailoring bottleneck (see Discovery Findings, friction point 3) by removing repeated research cost from each application cycle.

### Matching logic (two-part, weighted)
- **Part 1 — Career Target as gate:** for MVP, Career Target = **industries + company criteria only**, self-stated by the user, and determines which companies enter the monitored shortlist. This is a filter, not a score — a company either fits the target and gets monitored, or it doesn't.
  - **"Growth-skills desired" dropped from the MVP gate:** too fuzzy/undiscovered an input for users to self-state confidently without the dimension-surfacing help that's deferred (see Company Scoping, above). Deferred back into the gate once that capability ships.
  - **Career Target is set once at onboarding, then locked for MVP** — the gate is not re-run against drift over time. If the user's sense of direction changes, they must manually revisit their filters; the product does not proactively detect or prompt for drift.
- **Part 2 — Job offer scoring within selected companies:** skill-fit (from Professional Capital) is the dominant scoring factor for individual job ads. Career Target still contributes to the score, but as a lighter-weight signal — it already did its main work at the company-selection stage.
- Rationale: matching isn't just current-skill-to-ATS overlap; it must reflect the career *direction* the user wants (skills to grow, industries of interest), not only skills already held — see JTBD, below. **Note:** the growth-skills component of this rationale is currently deferred out of the MVP gate (see above) — MVP's gate runs on industries + company criteria only.

### Data access & permissions (MVP)
- Strictly self-contained: no email, no calendar integrations (privacy/setup friction outweighs benefit for now).
- AI recommends + drafts only; user always submits applications themselves (no autonomous submission in MVP).

### Metrics (MVP)
- Upstream engagement only: profile completeness, ads shown, ads viewed, ads selected, drafts generated/iterated.
- No outcome tracking (applied/interview/offer status) in MVP — revisit once trust/integrations make more sense.
- Note: the User-Ad-Status table (see Job sourcing, above) doubles as the substrate for this tracking — shown/viewed/selected map directly onto ad status values rather than needing separate instrumentation.

### Target users
- Digitally active professionals, globally — both employed-but-open-to-change and unemployed-and-searching.
- Core need: find the right opportunities efficiently + present profile relevantly for each one.

### Platform & goal of v1
- Web app (not mobile-first).
- V1 goal: **personal prototype** for own use, with a plausible future path to a 5–20 user MVP — architecture choices should avoid painting into a corner, without over-building for scale not yet needed.
- Builder is a complete technical beginner, using Cursor/Claude Code as AI coding assistants.

### Tech stack
- **App code:** Next.js (React + TypeScript) — chosen for strong AI-coding-assistant support (heavily represented in training data), and because it handles frontend + backend (API routes) in one project.
- **Data storage:** Supabase (Postgres) — chosen over SQLite for safe concurrent writes (background worker + live app), and because it bundles auth/storage for a future multi-user MVP without a rewrite.
- **App hosting/serving:** Vercel — pairs natively with Next.js.
- **Background monitoring/scraping worker:** GitHub Actions (scheduled workflow) for now — free, simple, no idle-service billing, teaches transferable CI/CD automation skills. **Render** identified as the natural next step if/when the job outgrows a once-daily scheduled script (e.g., needs more frequent runs, longer execution, or other persistent backend logic).
- **LLM provider (matching/scoring/drafting calls):** left open, to decide closer to build.

---

## Discovery Findings (2026-08-24)

Lightweight Discovery pass (journey map + JTBD, self + informal peer interviews planned) to pressure-test feature decisions against real user pain points, starting with the builder's own job search. Current hand-run method (LLM-assisted company sourcing → LinkedIn monitoring → manual tracking → LLM-assisted CV/cover letter tailoring) already mirrors the product's intended core loop — Discovery's job is to find what breaks at scale or gets skipped, not to invent new value from scratch.

**Pivot point:** a conversation with a close contact resolved a confidence/legitimacy problem (imposter feeling), which *enabled* the process fix that followed — not a tool or workflow change. Product can't replicate this, but may be able to prevent the conditions that caused it (effort/result disconnect, unfocused/generic applying).

**Three confirmed, quantified friction points:**
1. **Company sourcing bottleneck:** builder identified 80 target companies but almost never visits their career pages manually ("bloquant — je ne le fais quasiment jamais"). Roughly 30 of 80 target companies are effectively invisible today unless they happen to post to LinkedIn.
2. **Unverified LinkedIn blind spot:** LinkedIn saved-search filter (title="Product Manager", from the 80 companies, EU, last 24h) is the only active monitoring channel. Builder has never verified how many relevant offers are missed (different job titles, companies that don't post to LinkedIn, etc.).
3. **Tailoring throughput ceiling:** current CV + cover letter customization cycle takes **1–2 hours per application**, done manually per job ad. This is the single largest time cost in the loop and caps how many quality applications can be sent per week.

**Jobs To Be Done (combined statement):**
> "When I'm searching for and applying to jobs, I want to correctly identify roles that match not just my current skills but the direction I actually want my career to go — and then understand each company deeply enough to apply with real motivation — so that I put my energy only where it's genuinely worth it, and every application I send is one I'm proud of."

Two sub-components (kept for traceability to the journey map): an **allocation job** — pre-application, targeting energy toward roles matching desired career *direction* (maps to sourcing/monitoring stages) — and an **execution-quality job** — at application time, deep company understanding → motivation → pride in what's sent (maps to tailoring stages).

---

## Decision Log

Condensed reasoning trail for decisions already folded into "Confirmed Features / Decisions," above. Kept short on purpose — full detail lives in the relevant Confirmed Features subsection; this log exists so the *why* isn't lost, not to re-argue it.

- **2026-08-25 — Profiling:** original design assumed missing info would surface as a detectable "gap" against an imported document; that fails for experience never written down anywhere. → Proactive Elicitation Mode (see Profiling, above). Deferred: "Career Pivot" mode (see Deferred Ideas).
- **2026-08-25 — Job Sourcing:** root cause (via Five Whys) is that LinkedIn wins not on coverage but because it gives freshness (last-24h filter) and dedup (seen/applied markers) *for free* — raw scraped coverage without a state layer would be worse than the current manual method for daily use. → email-inbox freshness model (see Job sourcing, above). Deferred: "since last login" digest, dismissed-as-scoring-signal (see Deferred Ideas).
- **2026-08-25 — Agentic Workflow:** the "which of the six agents owns state-tracking" question dissolved once it became clear there were two distinct write paths on two different triggers (scheduled worker run vs. live user action), not one concern needing one owner. → ad-lifecycle step is a new non-Agent pipeline stage; user-status tracking is ordinary backend logic (see Agentic workflow, above).
- **2026-08-26 — Problem framing:** the original "job search overload / too many ads to sift through" framing didn't match the builder's actual friction points (invisible companies, tailoring throughput) — the real pre-scoping pain is **precision-shaped, not volume-shaped** (lacking usable criteria, not drowning in signal). → Company Scoping locked as a one-shot, filters-only pass for MVP (see Company Scoping, above); "overload" framing flagged as stale in the Product Concept summary.
- **2026-08-26 — Career Target stability:** cross-checking the two-part matching gate against the JTBD (direction as something still being worked out) and the journey map's pivot point (direction/confidence came from a human conversation, not a tool) surfaced a real tension — "growth-skills desired" asks users to self-state the same kind of undiscovered criterion that needed outside help to surface for the builder. → growth-skills dropped from the MVP gate; Career Target locked at onboarding, not re-run against drift (see Matching logic, above).

---

## Risks & Watch List

Named during the 2026-08-26 Problem Framing Stress-Test but not actioned — carried forward for awareness during future design work, not current decisions.

- **AI-tailoring may speed up genericness rather than solve the "execution-quality" JTBD** (personal motivation, pride in what's sent) — the builder's own unblock came from human-restored conviction, not better-generated content. Worth keeping in view when designing the Application Agent's drafting behavior.
- **No outcome tracking means the core matching hypothesis (two-part weighted gate + skill-fit score) is currently unfalsifiable** within the product itself — accepted as a known blind spot alongside the existing MVP metrics decision, not a new one.

---

## Open Questions

- LLM provider choice for reasoning calls (matching, drafting, clarifying questions).
- Repo structure.
- Authentication approach (deferred — not needed for single-user personal prototype, but worth planning for before multi-user MVP).
- Security considerations.
- Development workflow.
- Full code-level design of the agent workflows (partially resolved: ad-lifecycle step's placement and non-Agent status are decided; remaining agents — Profile, Company Discovery, Company Enrichment, Job Matching, Job Analysis, Application — still need code-level design).
- Whether "applied" should be a User-Ad-Status value distinct from "interacted" (to confirm at schema design time).
- Whether the "pre-criteria" MVP scope gap matters for anyone beyond the builder — cheapest test is likely the planned peer interviews.

## Rejected Ideas (and why)

- **Autonomous application submission** — rejected for MVP; too much trust/liability risk (wrong info going out under user's name, ATS quirks) without being necessary to prove core value.
- **Email/calendar integration for outcome tracking** — rejected for MVP; too much privacy friction and integration overhead for a personal prototype stage.
- **SQLite as the database** — rejected in favor of Postgres/Supabase due to concurrent-write needs (background worker + live app) and smoother path to multi-user later.
- **Building 6-7 fully autonomous independent agents from the start** — rejected in favor of a small number of deterministic workflows with embedded LLM calls; autonomy only where it provides real benefit.
- **Large, upfront/front-loaded proactive elicitation pass during onboarding** — rejected in favor of a deferred, continuously-refining elicitation queue; a "complete profile" is an asymptote, not an achievable target, so front-loading chases a state that never arrives.

## Deferred Ideas (for later versions)

- **"Career Pivot" mode:** helping infer/suggest skills for a target role the user does *not* yet have experience in, rather than assuming existing experience in the target job. Can't rely on the user's own scraped ad history (no track record in that direction) or reliable self-recall as a grounding signal. Likely needs a different sourcing strategy (broader market research per role, skill-gap framing) and possibly a distinct "skills to develop" field in Career Target rather than Professional Capital. Touches the two-part matching logic differently than same-track job search. Needs its own brief when prioritized.
- **"Since you last logged in" digest notification:** a literal "here's what's changed" summary would require an explicit `last_checkin_at` timestamp on the user record — not part of the locked sparse/derived freshness model, which has no session boundary recorded anywhere. Additive feature, not a requirement of core freshness logic.
- **Dismissed ads feeding back into Job Matching Agent scoring** (e.g., repeated dismissals from a company silently downweighting future ads from it): held at "pure suppression flag, no scoring impact" for MVP. Revisit relevance in a future version.
- **Dimension-surfacing + values-advising for company scoping:** helping users discover which criteria/dimensions matter to them — e.g. surfacing axes like company size, funding stage, growth vs. stability — rather than assuming they arrive with usable criteria already. Deliberately excluded from MVP, which offers filters only. This is the capability that would close the "pre-criteria" MVP scope gap.
- **Growth-skills back into the Career Target gate:** reinstate once dimension-surfacing/values-advising ships, since self-stating "skills to grow into" needs the same kind of scaffolding.
- **Multiple concurrent profiles per user, each with its own distinct Career Target:** would let a user maintain two genuinely different directions (e.g. an individual-contributor track and a founder-adjacent track) simultaneously, instead of Career Target being locked to a single choice. Not a small add — touches matching and drafting layers (separate shortlists, separate tailored drafts), not just onboarding.

## Current Focus

Feature refinement is substantially advanced across two passes (Discovery synthesis on 2026-08-25; Problem Framing Stress-Test on 2026-08-26). Next step: return to code-level agent/workflow design and remaining infra decisions (repo structure, auth, dev workflow, LLM provider selection), now informed by the ad-lifecycle pipeline step, the Agent/non-Agent naming convention, and the narrowed MVP scope from the stress-test session.

Still pending from Discovery: peer interview synthesis and empathy map, persona consolidation — the peer interviews are also the cheapest way to test whether the "pre-criteria" MVP gap (Open Questions) matters for anyone beyond the builder.
