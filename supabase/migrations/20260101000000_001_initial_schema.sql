-- ==============================================================================
-- 001_initial_schema.sql
-- Digital Reverse Shark Tank - IEEE Computer Society VVCE Student Branch
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'judge', 'team')),
  display_name text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Events Table (Single-row configuration)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Digital Reverse Shark Tank 2026',
  stage text not null default 'SETUP' check (
    stage in ('SETUP', 'PRESENTATIONS', 'INVESTMENT_OPEN', 'INVESTMENT_CLOSED', 'JUDGING_CLOSED', 'VERIFICATION', 'PUBLISHED')
  ),
  initial_balance integer not null default 1000 check (initial_balance > 0),
  weight_judge numeric(5,2) not null default 60.00 check (weight_judge >= 0 and weight_judge <= 100),
  weight_invest numeric(5,2) not null default 40.00 check (weight_invest >= 0 and weight_invest <= 100),
  reveal_received_totals boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_weights_sum check (weight_judge + weight_invest = 100.00)
);

-- 3. Teams Table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  team_no integer not null unique check (team_no > 0),
  name text not null,
  failed_company text not null,
  pitch_summary text not null,
  presentation_order integer not null default 1,
  presentation_status text not null default 'Pending' check (
    presentation_status in ('Pending', 'Presenting', 'Completed')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Judges Table
create table if not exists public.judges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Judge Team Exclusions (Conflict of interest)
create table if not exists public.judge_team_exclusions (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.judges(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (judge_id, team_id)
);

-- 6. Criteria Table
create table if not exists public.criteria (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  max_score numeric(5,2) not null default 10.00 check (max_score > 0),
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Investments Table (Current state)
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  investor_team_id uuid not null references public.teams(id) on delete restrict,
  target_team_id uuid not null references public.teams(id) on delete restrict,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_team_id, target_team_id),
  constraint check_no_self_investment check (investor_team_id <> target_team_id)
);

-- 8. Investment Events (Append-only history)
create table if not exists public.investment_events (
  id uuid primary key default gen_random_uuid(),
  investor_team_id uuid not null references public.teams(id) on delete restrict,
  target_team_id uuid not null references public.teams(id) on delete restrict,
  old_amount integer not null default 0,
  new_amount integer not null default 0,
  action text not null check (action in ('create', 'update', 'delete', 'admin_correction')),
  reason text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 9. Evaluations Table
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.judges(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (judge_id, team_id)
);

-- 10. Evaluation Scores Table
create table if not exists public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  criterion_id uuid not null references public.criteria(id) on delete restrict,
  score numeric(5,2) not null check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, criterion_id)
);

-- 11. Evaluation History (Append-only snapshots)
create table if not exists public.evaluation_history (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete restrict,
  judge_id uuid not null references public.judges(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  action text not null check (action in ('submitted', 'reopened')),
  normalized_score numeric(6,2),
  scores_snapshot jsonb not null default '{}'::jsonb,
  reason text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 12. Evaluation Waivers (Admin waivers for missing evaluation pairs)
create table if not exists public.evaluation_waivers (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.judges(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  reason text not null,
  admin_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (judge_id, team_id)
);

-- 13. Results Snapshots Table
create table if not exists public.results_snapshots (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'preview' check (status in ('preview', 'published')),
  weight_judge numeric(5,2) not null,
  weight_invest numeric(5,2) not null,
  highest_investment_points integer not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- 14. Result Rows Table
create table if not exists public.result_rows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.results_snapshots(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  avg_judge_score numeric(6,2) not null,
  points_received integer not null,
  investment_score numeric(6,2) not null,
  final_score numeric(6,2) not null,
  rank integer not null check (rank > 0),
  created_at timestamptz not null default now(),
  unique (snapshot_id, team_id)
);

-- 15. Audit Logs Table (Append-only)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- INDEXES FOR FOREIGN KEYS AND LOOKUPS
-- ==============================================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_teams_profile_id on public.teams(profile_id);
create index if not exists idx_teams_presentation_order on public.teams(presentation_order);
create index if not exists idx_judges_profile_id on public.judges(profile_id);
create index if not exists idx_investments_investor on public.investments(investor_team_id);
create index if not exists idx_investments_target on public.investments(target_team_id);
create index if not exists idx_investment_events_investor on public.investment_events(investor_team_id);
create index if not exists idx_investment_events_target on public.investment_events(target_team_id);
create index if not exists idx_evaluations_judge on public.evaluations(judge_id);
create index if not exists idx_evaluations_team on public.evaluations(team_id);
create index if not exists idx_evaluations_status on public.evaluations(status);
create index if not exists idx_eval_scores_eval on public.evaluation_scores(evaluation_id);
create index if not exists idx_eval_scores_criterion on public.evaluation_scores(criterion_id);
create index if not exists idx_result_rows_snapshot on public.result_rows(snapshot_id);
create index if not exists idx_result_rows_team on public.result_rows(team_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- ==============================================================================
-- APPEND-ONLY INTEGRITY TRIGGERS
-- ==============================================================================
create or replace function public.prevent_mutation_append_only()
returns trigger as $$
begin
  raise exception 'Modification or deletion of append-only audit records is strictly prohibited.';
end;
$$ language plpgsql;

create trigger trg_immutable_investment_events
before update or delete on public.investment_events
for each row execute function public.prevent_mutation_append_only();

create trigger trg_immutable_evaluation_history
before update or delete on public.evaluation_history
for each row execute function public.prevent_mutation_append_only();

create trigger trg_immutable_audit_logs
before update or delete on public.audit_logs
for each row execute function public.prevent_mutation_append_only();

-- Protect published result rows from mutation
create or replace function public.prevent_published_result_mutation()
returns trigger as $$
declare
  v_status text;
begin
  select status into v_status from public.results_snapshots where id = old.snapshot_id;
  if v_status = 'published' then
    raise exception 'Published competition results are permanently immutable.';
  end if;
  return old;
end;
$$ language plpgsql;

create trigger trg_immutable_published_result_rows
before update or delete on public.result_rows
for each row execute function public.prevent_published_result_mutation();
