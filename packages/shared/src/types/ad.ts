// Stub shape only — full schema design pending (see docs/career-engineer-project-state-*.md, Job sourcing: Ads table).
// Global, shared, worker-written — one row per scraped ad. Ads accumulate indefinitely (email-inbox model).
export interface Ad {
  dedupKey: string;
  company: string;
  firstSeenAt: string;
  lastSeenAt: string;
  rawContent: string;
  stale: boolean;
}
