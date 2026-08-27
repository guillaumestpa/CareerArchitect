// Stub shape only — full schema design pending (see docs/career-engineer-project-state-*.md, Data model / Matching logic).
// MVP gate uses industries + company criteria only; other fields carried for future use.
export interface CareerTarget {
  industries: string[];
  companyCriteria: unknown;
  roles: string[];
  seniority: string | null;
  location: string | null;
}
