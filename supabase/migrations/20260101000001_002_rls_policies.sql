-- ==============================================================================
-- 002_rls_policies.sql
-- Digital Reverse Shark Tank - Row Level Security Policies
-- ==============================================================================

-- Helper functions with fixed search_path to prevent search-path injection
create or replace function public.current_app_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function public.current_team_id()
returns uuid as $$
  select id from public.teams where profile_id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function public.current_judge_id()
returns uuid as $$
  select id from public.judges where profile_id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- ==============================================================================
-- ENABLE RLS ON ALL TABLES (DEFAULT DENY)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.judges enable row level security;
alter table public.judge_team_exclusions enable row level security;
alter table public.criteria enable row level security;
alter table public.investments enable row level security;
alter table public.investment_events enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.evaluation_history enable row level security;
alter table public.evaluation_waivers enable row level security;
alter table public.results_snapshots enable row level security;
alter table public.result_rows enable row level security;
alter table public.audit_logs enable row level security;

-- ==============================================================================
-- 1. PROFILES POLICIES
-- ==============================================================================
create policy "admin_manage_profiles"
on public.profiles for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "users_read_own_profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "users_update_own_profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ==============================================================================
-- 2. EVENTS POLICIES
-- ==============================================================================
create policy "public_read_events"
on public.events for select
to anon, authenticated
using (true);

create policy "admin_manage_events"
on public.events for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 3. TEAMS POLICIES
-- ==============================================================================
create policy "public_read_active_teams"
on public.teams for select
to anon, authenticated
using (is_active = true or public.current_app_role() = 'admin');

create policy "admin_manage_teams"
on public.teams for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 4. JUDGES POLICIES
-- ==============================================================================
create policy "admin_manage_judges"
on public.judges for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "judge_read_own_record"
on public.judges for select
to authenticated
using (profile_id = auth.uid());

-- ==============================================================================
-- 5. JUDGE TEAM EXCLUSIONS POLICIES
-- ==============================================================================
create policy "admin_manage_exclusions"
on public.judge_team_exclusions for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "judge_read_own_exclusions"
on public.judge_team_exclusions for select
to authenticated
using (judge_id = public.current_judge_id());

-- ==============================================================================
-- 6. CRITERIA POLICIES
-- ==============================================================================
create policy "anyone_read_active_criteria"
on public.criteria for select
to authenticated
using (is_active = true or public.current_app_role() = 'admin');

create policy "admin_manage_criteria"
on public.criteria for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 7. INVESTMENTS POLICIES (CONFIDENTIALITY ENFORCED)
-- ==============================================================================
-- Admin can view all investments for monitoring
create policy "admin_read_all_investments"
on public.investments for select
to authenticated
using (public.current_app_role() = 'admin');

-- Teams can read ONLY rows where they are the INVESTOR
-- Strictly NO access to rows where they are target!
create policy "team_read_own_investments"
on public.investments for select
to authenticated
using (investor_team_id = public.current_team_id());

-- Mutations on investments go through security definer functions (set_investment, remove_investment)
-- Direct client writes are blocked by RLS
create policy "admin_manage_investments"
on public.investments for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 8. INVESTMENT EVENTS POLICIES (APPEND-ONLY)
-- ==============================================================================
create policy "admin_read_all_investment_events"
on public.investment_events for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "team_read_own_investment_events"
on public.investment_events for select
to authenticated
using (investor_team_id = public.current_team_id());

-- ==============================================================================
-- 9. EVALUATIONS POLICIES
-- ==============================================================================
create policy "admin_read_all_evaluations"
on public.evaluations for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "judge_read_own_evaluations"
on public.evaluations for select
to authenticated
using (judge_id = public.current_judge_id());

create policy "judge_write_own_evaluations"
on public.evaluations for insert
to authenticated
with check (judge_id = public.current_judge_id());

create policy "judge_update_own_evaluations"
on public.evaluations for update
to authenticated
using (judge_id = public.current_judge_id())
with check (judge_id = public.current_judge_id());

-- ==============================================================================
-- 10. EVALUATION SCORES POLICIES
-- ==============================================================================
create policy "admin_read_all_evaluation_scores"
on public.evaluation_scores for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "judge_read_own_evaluation_scores"
on public.evaluation_scores for select
to authenticated
using (
  evaluation_id in (
    select id from public.evaluations where judge_id = public.current_judge_id()
  )
);

create policy "judge_write_own_evaluation_scores"
on public.evaluation_scores for insert
to authenticated
with check (
  evaluation_id in (
    select id from public.evaluations where judge_id = public.current_judge_id()
  )
);

create policy "judge_update_own_evaluation_scores"
on public.evaluation_scores for update
to authenticated
using (
  evaluation_id in (
    select id from public.evaluations where judge_id = public.current_judge_id()
  )
)
with check (
  evaluation_id in (
    select id from public.evaluations where judge_id = public.current_judge_id()
  )
);

-- ==============================================================================
-- 11. EVALUATION HISTORY POLICIES
-- ==============================================================================
create policy "admin_read_all_evaluation_history"
on public.evaluation_history for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "judge_read_own_evaluation_history"
on public.evaluation_history for select
to authenticated
using (judge_id = public.current_judge_id());

-- ==============================================================================
-- 12. EVALUATION WAIVERS POLICIES
-- ==============================================================================
create policy "admin_manage_waivers"
on public.evaluation_waivers for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "judge_read_own_waivers"
on public.evaluation_waivers for select
to authenticated
using (judge_id = public.current_judge_id());

-- ==============================================================================
-- 13. RESULTS SNAPSHOTS POLICIES
-- ==============================================================================
create policy "public_read_published_snapshots"
on public.results_snapshots for select
to anon, authenticated
using (status = 'published');

create policy "admin_manage_snapshots"
on public.results_snapshots for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 14. RESULT ROWS POLICIES
-- ==============================================================================
create policy "public_read_published_result_rows"
on public.result_rows for select
to anon, authenticated
using (
  snapshot_id in (
    select id from public.results_snapshots where status = 'published'
  )
);

create policy "admin_manage_result_rows"
on public.result_rows for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- ==============================================================================
-- 15. AUDIT LOGS POLICIES
-- ==============================================================================
create policy "admin_read_audit_logs"
on public.audit_logs for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "admin_insert_audit_logs"
on public.audit_logs for insert
to authenticated
with check (public.current_app_role() = 'admin' or actor_id = auth.uid());
