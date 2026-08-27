// Stub shape only — full schema design pending (see docs/career-engineer-project-state-*.md, Job sourcing: User-Ad-Status table).
// Sparse, per-user — a row is created only on first user interaction with a given ad. "New" is a derived absence, not stored.
export type UserAdStatusValue = "inspected" | "interacted" | "applied" | "dismissed";

export interface UserAdStatus {
  userId: string;
  adId: string;
  status: UserAdStatusValue;
  updatedAt: string;
}
