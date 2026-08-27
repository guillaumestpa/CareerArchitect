// Stub shape only — full schema design pending (see docs/career-engineer-project-state-*.md, Data model).
// How the user positions themselves for one specific job (derived per application).
export interface ApplicationProfile {
  adId: string;
  resumeDraft: string | null;
  coverLetterDraft: string | null;
}
