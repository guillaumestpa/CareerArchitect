-- Initial Career Engineer schema.
--
-- Creates the six enum types, the two shared trigger functions, and the thirteen
-- tables of the confirmed Phase 1 data model, in dependency order. Postgres DDL is
-- transactional, so this whole file applies or none of it does.
--
-- Deliberately absent (out of scope for this pass, not oversights):
--   * RLS policies — every table below will be flagged by the Supabase linter as
--     missing RLS. That is expected; policies land in a later pass.
--   * Seed data — `industries` is a lookup table and stays empty after migration.
--   * A unique index on capital_skills (user_id, lower(name)) — explicitly rejected:
--     it would force a check-then-upsert write path that does not exist yet.

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------
-- Type names are singular, table names plural. `user_ad_status_value` is
-- deliberately not `user_ad_status`: Postgres shares one namespace between tables
-- and types, and the table needs that name.

create type public.capital_provenance as enum (
  'ad_confirmed',
  'aggregate_inferred',
  'cold_start_inferred',
  'user_volunteered'
);

create type public.employee_count_bucket as enum (
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+'
);

create type public.revenue_bucket as enum (
  'under_10m',
  '10m_50m',
  '50m_250m',
  '250m_1b',
  '1b_10b',
  '10b_plus'
);

create type public.remote_policy as enum (
  'fully_remote',
  'hybrid_fixed_days',
  'hybrid_flexible',
  'onsite_only'
);

create type public.certification as enum (
  'b_corp',
  'great_place_to_work',
  'gender_equality_index'
);

create type public.user_ad_status_value as enum (
  'inspected',
  'interacted',
  'applied',
  'dismissed'
);

-- ---------------------------------------------------------------------------
-- 2. Shared trigger functions
-- ---------------------------------------------------------------------------

-- `updated_at` is owned by the database, never written by application code.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- `initial_content` on the draft tables is write-once. A CHECK cannot express this
-- (it only ever sees the new row), so immutability is enforced by this trigger.
create function public.prevent_initial_content_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.initial_content is distinct from old.initial_content then
    raise exception
      'initial_content is immutable and cannot be updated (table %.%, id %)',
      tg_table_schema, tg_table_name, old.id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_companies_name_not_blank check (length(trim(name)) > 0)
);

create trigger set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. ads
-- ---------------------------------------------------------------------------
-- Global, not user-scoped: one row per scraped ad, shared by every user.

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null,
  company_id uuid not null references public.companies (id) on delete restrict,
  title text not null,
  url text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_content text not null,
  stale_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_ads_dedup_key unique (dedup_key),
  constraint ck_ads_seen_order check (last_seen_at >= first_seen_at),
  constraint ck_ads_title_not_blank check (length(trim(title)) > 0)
);

-- FK columns are not indexed automatically and this one is joined constantly.
create index idx_ads_company_id on public.ads (company_id);

create trigger set_updated_at
  before update on public.ads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. industries
-- ---------------------------------------------------------------------------
-- A table rather than an enum because the taxonomy grows over time. Empty after
-- migration; seeding is out of scope.

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_industries_name unique (name)
);

create trigger set_updated_at
  before update on public.industries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. career_targets
-- ---------------------------------------------------------------------------
-- One row per user (enforced by the UNIQUE on user_id). The array columns are
-- multi-select sets, never nullable: null and '{}' would be two encodings of the
-- same "no preference" meaning. `publicly_traded` IS nullable — there null is the
-- third state (true = public only, false = private only, null = no preference).

create table public.career_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  employee_count_buckets public.employee_count_bucket[] not null default '{}',
  revenue_buckets public.revenue_bucket[] not null default '{}',
  remote_policies public.remote_policy[] not null default '{}',
  required_certifications public.certification[] not null default '{}',
  publicly_traded boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_career_targets_user_id unique (user_id)
);

create trigger set_updated_at
  before update on public.career_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. career_target_industries
-- ---------------------------------------------------------------------------
-- No updated_at: join rows have nothing mutable, changing a selection is
-- delete + insert.

create table public.career_target_industries (
  id uuid primary key default gen_random_uuid(),
  career_target_id uuid not null references public.career_targets (id) on delete cascade,
  industry_id uuid not null references public.industries (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint uq_career_target_industries_pair unique (career_target_id, industry_id)
);

create index idx_career_target_industries_industry_id
  on public.career_target_industries (industry_id);

-- ---------------------------------------------------------------------------
-- 8. career_target_locations
-- ---------------------------------------------------------------------------
-- `city` null means "the whole country". NULLS NOT DISTINCT is load-bearing: a
-- plain UNIQUE would let (FR, null) be inserted twice, since NULLs are normally
-- treated as distinct.

create table public.career_target_locations (
  id uuid primary key default gen_random_uuid(),
  career_target_id uuid not null references public.career_targets (id) on delete cascade,
  country_code text not null,
  city text,
  constraint ck_career_target_locations_country_code check (country_code ~ '^[A-Z]{2}$'),
  constraint ck_career_target_locations_city_not_blank check (city is null or length(trim(city)) > 0),
  constraint uq_career_target_locations_scope
    unique nulls not distinct (career_target_id, country_code, city)
);

-- ---------------------------------------------------------------------------
-- 9. Professional Capital — five sibling tables
-- ---------------------------------------------------------------------------
-- Each carries the same evidence block: `provenance` says where the entry came
-- from, and exactly one of `evidence_ad_id` / `evidence_category` is populated to
-- back it up. The paired CHECKs are what keep that invariant true.

create table public.capital_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provenance public.capital_provenance not null,
  evidence_ad_id uuid references public.ads (id) on delete restrict,
  evidence_category text,
  title text not null,
  organization text,
  description text,
  started_on date,
  ended_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_capital_experiences_evidence check (
    (provenance = 'ad_confirmed' and evidence_ad_id is not null and evidence_category is null)
    or
    (provenance <> 'ad_confirmed' and evidence_ad_id is null and evidence_category is not null)
  ),
  constraint ck_capital_experiences_evidence_category check (
    evidence_category is null
    or evidence_category in ('cv_import', 'linkedin_import', 'manual_entry')
  ),
  constraint ck_capital_experiences_date_order check (
    ended_on is null or started_on is null or ended_on >= started_on
  ),
  constraint ck_capital_experiences_current_has_no_end check (
    not (is_current and ended_on is not null)
  )
);

create index idx_capital_experiences_user_id on public.capital_experiences (user_id);

create trigger set_updated_at
  before update on public.capital_experiences
  for each row execute function public.set_updated_at();

create table public.capital_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provenance public.capital_provenance not null,
  evidence_ad_id uuid references public.ads (id) on delete restrict,
  evidence_category text,
  name text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_capital_skills_evidence check (
    (provenance = 'ad_confirmed' and evidence_ad_id is not null and evidence_category is null)
    or
    (provenance <> 'ad_confirmed' and evidence_ad_id is null and evidence_category is not null)
  ),
  constraint ck_capital_skills_evidence_category check (
    evidence_category is null
    or evidence_category in ('cv_import', 'linkedin_import', 'manual_entry')
  ),
  constraint ck_capital_skills_name_not_blank check (length(trim(name)) > 0)
);

create index idx_capital_skills_user_id on public.capital_skills (user_id);

create trigger set_updated_at
  before update on public.capital_skills
  for each row execute function public.set_updated_at();

create table public.capital_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provenance public.capital_provenance not null,
  evidence_ad_id uuid references public.ads (id) on delete restrict,
  evidence_category text,
  title text not null,
  description text,
  occurred_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_capital_achievements_evidence check (
    (provenance = 'ad_confirmed' and evidence_ad_id is not null and evidence_category is null)
    or
    (provenance <> 'ad_confirmed' and evidence_ad_id is null and evidence_category is not null)
  ),
  constraint ck_capital_achievements_evidence_category check (
    evidence_category is null
    or evidence_category in ('cv_import', 'linkedin_import', 'manual_entry')
  )
);

create index idx_capital_achievements_user_id on public.capital_achievements (user_id);

create trigger set_updated_at
  before update on public.capital_achievements
  for each row execute function public.set_updated_at();

create table public.capital_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provenance public.capital_provenance not null,
  evidence_ad_id uuid references public.ads (id) on delete restrict,
  evidence_category text,
  name text not null,
  description text,
  url text,
  started_on date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_capital_projects_evidence check (
    (provenance = 'ad_confirmed' and evidence_ad_id is not null and evidence_category is null)
    or
    (provenance <> 'ad_confirmed' and evidence_ad_id is null and evidence_category is not null)
  ),
  constraint ck_capital_projects_evidence_category check (
    evidence_category is null
    or evidence_category in ('cv_import', 'linkedin_import', 'manual_entry')
  ),
  constraint ck_capital_projects_date_order check (
    ended_on is null or started_on is null or ended_on >= started_on
  )
);

create index idx_capital_projects_user_id on public.capital_projects (user_id);

create trigger set_updated_at
  before update on public.capital_projects
  for each row execute function public.set_updated_at();

create table public.capital_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provenance public.capital_provenance not null,
  evidence_ad_id uuid references public.ads (id) on delete restrict,
  evidence_category text,
  institution text not null,
  credential text,
  field_of_study text,
  started_on date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_capital_education_evidence check (
    (provenance = 'ad_confirmed' and evidence_ad_id is not null and evidence_category is null)
    or
    (provenance <> 'ad_confirmed' and evidence_ad_id is null and evidence_category is not null)
  ),
  constraint ck_capital_education_evidence_category check (
    evidence_category is null
    or evidence_category in ('cv_import', 'linkedin_import', 'manual_entry')
  ),
  constraint ck_capital_education_date_order check (
    ended_on is null or started_on is null or ended_on >= started_on
  )
);

create index idx_capital_education_user_id on public.capital_education (user_id);

create trigger set_updated_at
  before update on public.capital_education
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. resume_drafts
-- ---------------------------------------------------------------------------
-- `initial_content` is the first generated draft and never changes;
-- `current_content` is overwritten in place each iteration. `word_diff_count` is
-- computed once by application code at lock time, hence its dependency on
-- `locked_at`.

create table public.resume_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete restrict,
  initial_content text not null,
  current_content text not null,
  locked_at timestamptz,
  word_diff_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_resume_drafts_user_ad unique (user_id, ad_id),
  constraint ck_resume_drafts_diff_requires_lock check (
    word_diff_count is null or locked_at is not null
  ),
  constraint ck_resume_drafts_diff_non_negative check (
    word_diff_count is null or word_diff_count >= 0
  )
);

create trigger set_updated_at
  before update on public.resume_drafts
  for each row execute function public.set_updated_at();

create trigger prevent_initial_content_update
  before update on public.resume_drafts
  for each row execute function public.prevent_initial_content_update();

-- ---------------------------------------------------------------------------
-- 11. cover_letter_drafts
-- ---------------------------------------------------------------------------
-- Structurally identical to resume_drafts and fully independent of it.

create table public.cover_letter_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete restrict,
  initial_content text not null,
  current_content text not null,
  locked_at timestamptz,
  word_diff_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_cover_letter_drafts_user_ad unique (user_id, ad_id),
  constraint ck_cover_letter_drafts_diff_requires_lock check (
    word_diff_count is null or locked_at is not null
  ),
  constraint ck_cover_letter_drafts_diff_non_negative check (
    word_diff_count is null or word_diff_count >= 0
  )
);

create trigger set_updated_at
  before update on public.cover_letter_drafts
  for each row execute function public.set_updated_at();

create trigger prevent_initial_content_update
  before update on public.cover_letter_drafts
  for each row execute function public.prevent_initial_content_update();

-- ---------------------------------------------------------------------------
-- 12. user_ad_status
-- ---------------------------------------------------------------------------
-- Sparse: a row exists only once a user has interacted with an ad, which is what
-- makes "new ads" derivable as the absence of a row. `applied` is self-reported;
-- the schema has no way to verify it and infers nothing. Legal status transitions
-- are application logic, not a CHECK.

create table public.user_ad_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete restrict,
  status public.user_ad_status_value not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_ad_status_user_ad unique (user_id, ad_id)
);

create trigger set_updated_at
  before update on public.user_ad_status
  for each row execute function public.set_updated_at();
