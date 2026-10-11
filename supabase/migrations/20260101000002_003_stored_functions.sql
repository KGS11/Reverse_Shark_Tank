-- ==============================================================================
-- 003_stored_functions.sql
-- Digital Reverse Shark Tank - Stored Procedures & Business Logic
-- ==============================================================================

-- 1. TRANSACTIONAL INVESTMENT FUNCTION
create or replace function public.set_investment(
  p_target_team_id uuid,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_investor_team_id uuid;
  v_stage text;
  v_initial_balance integer;
  v_other_allocated integer;
  v_new_total integer;
  v_old_amount integer;
  v_target_active boolean;
begin
  -- Authenticate caller role and derive investor team ID
  v_caller_role := public.current_app_role();
  if v_caller_role <> 'team' then
    raise exception 'Unauthorized: Only registered team accounts can allocate investment points.';
  end if;

  v_investor_team_id := public.current_team_id();
  if v_investor_team_id is null then
    raise exception 'Unauthorized: No active team record found for current user.';
  end if;

  -- Validate amount
  if p_amount is null or p_amount <= 0 then
    raise exception 'Allocation amount must be a positive integer.';
  end if;

  -- Reject self-investment
  if v_investor_team_id = p_target_team_id then
    raise exception 'Self-investment is strictly forbidden: A team cannot invest in itself.';
  end if;

  -- Verify event stage and get initial balance
  select stage, initial_balance into v_stage, v_initial_balance
  from public.events
  limit 1;

  if v_stage is null or v_stage <> 'INVESTMENT_OPEN' then
    raise exception 'Investment operations are prohibited: Current event stage is "%". Investments are accepted only when stage is "INVESTMENT_OPEN".', coalesce(v_stage, 'UNKNOWN');
  end if;

  -- Verify target team exists and is active
  select is_active into v_target_active
  from public.teams
  where id = p_target_team_id;

  if v_target_active is null or not v_target_active then
    raise exception 'Target team is invalid or inactive.';
  end if;

  -- SERIALIZATION: Lock investor's team row to serialize concurrent requests
  perform 1 from public.teams where id = v_investor_team_id for update;

  -- Calculate existing allocations excluding the current target
  select coalesce(sum(amount), 0) into v_other_allocated
  from public.investments
  where investor_team_id = v_investor_team_id
    and target_team_id <> p_target_team_id;

  v_new_total := v_other_allocated + p_amount;

  if v_new_total > v_initial_balance then
    raise exception 'Allocation exceeds available balance: Maximum available is %, attempted %.', (v_initial_balance - v_other_allocated), p_amount;
  end if;

  -- Check existing allocation for this target
  select amount into v_old_amount
  from public.investments
  where investor_team_id = v_investor_team_id
    and target_team_id = p_target_team_id;

  -- Upsert the investment
  insert into public.investments (investor_team_id, target_team_id, amount, updated_at)
  values (v_investor_team_id, p_target_team_id, p_amount, now())
  on conflict (investor_team_id, target_team_id)
  do update set
    amount = excluded.amount,
    updated_at = now();

  -- Append to immutable investment events
  insert into public.investment_events (
    investor_team_id,
    target_team_id,
    old_amount,
    new_amount,
    action,
    reason,
    actor_id
  ) values (
    v_investor_team_id,
    p_target_team_id,
    coalesce(v_old_amount, 0),
    p_amount,
    case when v_old_amount is null then 'create' else 'update' end,
    null,
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'investor_team_id', v_investor_team_id,
    'target_team_id', p_target_team_id,
    'amount', p_amount,
    'remaining_balance', (v_initial_balance - v_new_total)
  );
end;
$$;

-- 2. REMOVE INVESTMENT FUNCTION
create or replace function public.remove_investment(
  p_target_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_investor_team_id uuid;
  v_stage text;
  v_initial_balance integer;
  v_old_amount integer;
  v_total_allocated integer;
begin
  v_caller_role := public.current_app_role();
  if v_caller_role <> 'team' then
    raise exception 'Unauthorized: Only registered team accounts can modify investments.';
  end if;

  v_investor_team_id := public.current_team_id();
  if v_investor_team_id is null then
    raise exception 'Unauthorized: Team record not found.';
  end if;

  select stage, initial_balance into v_stage, v_initial_balance
  from public.events
  limit 1;

  if v_stage <> 'INVESTMENT_OPEN' then
    raise exception 'Investment modifications are locked outside the INVESTMENT_OPEN stage.';
  end if;

  -- Lock investor row
  perform 1 from public.teams where id = v_investor_team_id for update;

  select amount into v_old_amount
  from public.investments
  where investor_team_id = v_investor_team_id
    and target_team_id = p_target_team_id;

  if v_old_amount is null then
    return jsonb_build_object('success', true, 'message', 'No existing allocation found.');
  end if;

  -- Delete allocation
  delete from public.investments
  where investor_team_id = v_investor_team_id
    and target_team_id = p_target_team_id;

  -- Record event
  insert into public.investment_events (
    investor_team_id,
    target_team_id,
    old_amount,
    new_amount,
    action,
    reason,
    actor_id
  ) values (
    v_investor_team_id,
    p_target_team_id,
    v_old_amount,
    0,
    'delete',
    'Allocation removed by team',
    auth.uid()
  );

  select coalesce(sum(amount), 0) into v_total_allocated
  from public.investments
  where investor_team_id = v_investor_team_id;

  return jsonb_build_object(
    'success', true,
    'remaining_balance', (v_initial_balance - v_total_allocated)
  );
end;
$$;

-- 3. CONTROLLED VIEW OF RECEIVED TOTALS FOR A TEAM
create or replace function public.get_team_received_points_controlled(
  p_team_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_reveal boolean;
  v_stage text;
  v_caller_team_id uuid;
  v_total integer;
begin
  v_role := public.current_app_role();
  select stage, reveal_received_totals into v_stage, v_reveal from public.events limit 1;

  -- Admin can always view received totals
  if v_role = 'admin' then
    select coalesce(sum(amount), 0) into v_total from public.investments where target_team_id = p_team_id;
    return v_total;
  end if;

  -- Teams can view their OWN received total ONLY if revealed or published
  if v_role = 'team' then
    v_caller_team_id := public.current_team_id();
    if v_caller_team_id <> p_team_id then
      raise exception 'Confidentiality violation: Teams can never view other teams received points directly.';
    end if;

    if v_reveal or v_stage = 'PUBLISHED' then
      select coalesce(sum(amount), 0) into v_total from public.investments where target_team_id = p_team_id;
      return v_total;
    else
      return null; -- Confidential until admin reveals or published
    end if;
  end if;

  -- Judges and public cannot view intermediate received points
  if v_stage = 'PUBLISHED' then
    select coalesce(sum(amount), 0) into v_total from public.investments where target_team_id = p_team_id;
    return v_total;
  end if;

  return null;
end;
$$;

-- 4. SUBMIT EVALUATION FUNCTION
create or replace function public.submit_evaluation(
  p_evaluation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_judge_id uuid;
  v_eval_judge_id uuid;
  v_team_id uuid;
  v_stage text;
  v_active_crit_count integer;
  v_scored_crit_count integer;
  v_normalized_score numeric(6,2);
  v_scores_json jsonb;
begin
  v_judge_id := public.current_judge_id();
  if v_judge_id is null and public.current_app_role() <> 'admin' then
    raise exception 'Unauthorized: Only judges can submit evaluations.';
  end if;

  -- Verify evaluation ownership
  select judge_id, team_id into v_eval_judge_id, v_team_id
  from public.evaluations
  where id = p_evaluation_id;

  if v_eval_judge_id is null then
    raise exception 'Evaluation record not found.';
  end if;

  if public.current_app_role() <> 'admin' and v_eval_judge_id <> v_judge_id then
    raise exception 'Forbidden: Judges can only submit their own evaluations.';
  end if;

  -- Verify event stage
  select stage into v_stage from public.events limit 1;
  if v_stage not in ('PRESENTATIONS', 'INVESTMENT_OPEN') then
    raise exception 'Judging is closed for current event stage: %', v_stage;
  end if;

  -- Check all active criteria are scored
  select count(*) into v_active_crit_count from public.criteria where is_active = true;
  select count(*) into v_scored_crit_count
  from public.evaluation_scores es
  join public.criteria c on c.id = es.criterion_id
  where es.evaluation_id = p_evaluation_id and c.is_active = true;

  if v_scored_crit_count < v_active_crit_count then
    raise exception 'All active criteria must be scored before final submission (% of % scored).', v_scored_crit_count, v_active_crit_count;
  end if;

  -- Compute normalized score: sum over criteria of (score / max_score * weight)
  select round(coalesce(sum((es.score / c.max_score) * c.weight), 0), 2)
  into v_normalized_score
  from public.evaluation_scores es
  join public.criteria c on c.id = es.criterion_id
  where es.evaluation_id = p_evaluation_id and c.is_active = true;

  -- Snapshot scores into jsonb
  select jsonb_agg(jsonb_build_object(
    'criterion_id', es.criterion_id,
    'criterion_name', c.name,
    'score', es.score,
    'max_score', c.max_score,
    'weight', c.weight
  ))
  into v_scores_json
  from public.evaluation_scores es
  join public.criteria c on c.id = es.criterion_id
  where es.evaluation_id = p_evaluation_id;

  -- Update evaluation status
  update public.evaluations
  set status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  where id = p_evaluation_id;

  -- Append to evaluation history
  insert into public.evaluation_history (
    evaluation_id,
    judge_id,
    team_id,
    action,
    normalized_score,
    scores_snapshot,
    reason,
    actor_id
  ) values (
    p_evaluation_id,
    v_eval_judge_id,
    v_team_id,
    'submitted',
    v_normalized_score,
    coalesce(v_scores_json, '[]'::jsonb),
    'Submitted by judge',
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'evaluation_id', p_evaluation_id,
    'normalized_score', v_normalized_score
  );
end;
$$;

-- 5. ADMIN REOPEN EVALUATION FUNCTION
create or replace function public.reopen_evaluation(
  p_evaluation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eval_judge_id uuid;
  v_team_id uuid;
  v_stage text;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Unauthorized: Only event administrators can reopen evaluations.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'A documented reason is mandatory when reopening an evaluation.';
  end if;

  select stage into v_stage from public.events limit 1;
  if v_stage = 'PUBLISHED' then
    raise exception 'Cannot reopen evaluations after results have been published.';
  end if;

  select judge_id, team_id into v_eval_judge_id, v_team_id
  from public.evaluations
  where id = p_evaluation_id;

  if v_eval_judge_id is null then
    raise exception 'Evaluation record not found.';
  end if;

  update public.evaluations
  set status = 'draft',
      submitted_at = null,
      updated_at = now()
  where id = p_evaluation_id;

  -- Append to evaluation history
  insert into public.evaluation_history (
    evaluation_id,
    judge_id,
    team_id,
    action,
    reason,
    actor_id
  ) values (
    p_evaluation_id,
    v_eval_judge_id,
    v_team_id,
    'reopened',
    p_reason,
    auth.uid()
  );

  -- Append to audit logs
  insert into public.audit_logs (
    actor_id,
    action,
    entity,
    entity_id,
    details
  ) values (
    auth.uid(),
    'REOPEN_EVALUATION',
    'evaluations',
    p_evaluation_id::text,
    jsonb_build_object('reason', p_reason, 'judge_id', v_eval_judge_id, 'team_id', v_team_id)
  );

  return jsonb_build_object('success', true, 'reopened_id', p_evaluation_id);
end;
$$;

-- 6. MIRRORED SCORING AND RESULTS PUBLICATION ENGINE
create or replace function public.generate_results_snapshot(
  p_is_published boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_snapshot_id uuid;
  v_max_investment integer := 0;
  v_unsubmitted_count integer := 0;
  v_r record;
  v_current_rank integer := 1;
  v_display_rank integer := 1;
  v_prev_final numeric := -1;
  v_prev_judge numeric := -1;
  v_prev_points integer := -1;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Unauthorized: Only event administrators can generate or publish results.';
  end if;

  select * into v_event from public.events limit 1;

  if p_is_published and v_event.stage = 'PUBLISHED' then
    raise exception 'Results have already been published.';
  end if;

  -- VERIFICATION CHECK: Check for unsubmitted evaluations not waived
  select count(*) into v_unsubmitted_count
  from public.judges j
  cross join public.teams t
  where t.is_active = true
    and not exists (
      select 1 from public.judge_team_exclusions e
      where e.judge_id = j.id and e.team_id = t.id
    )
    and not exists (
      select 1 from public.evaluation_waivers w
      where w.judge_id = j.id and w.team_id = t.id
    )
    and not exists (
      select 1 from public.evaluations ev
      where ev.judge_id = j.id and ev.team_id = t.id and ev.status = 'submitted'
    );

  if p_is_published and v_unsubmitted_count > 0 then
    raise exception 'Cannot publish results: % pending evaluation pair(s) must be submitted or explicitly waived.', v_unsubmitted_count;
  end if;

  -- 1. Find highest investment points received across all active teams
  select coalesce(max(coalesce(inv_sum, 0)), 0) into v_max_investment
  from (
    select t.id, coalesce(sum(i.amount), 0) as inv_sum
    from public.teams t
    left join public.investments i on i.target_team_id = t.id
    where t.is_active = true
    group by t.id
  ) s;

  -- 2. Create results snapshot
  insert into public.results_snapshots (
    status,
    weight_judge,
    weight_invest,
    highest_investment_points,
    published_at
  ) values (
    case when p_is_published then 'published' else 'preview' end,
    v_event.weight_judge,
    v_event.weight_invest,
    v_max_investment,
    case when p_is_published then now() else null end
  ) returning id into v_snapshot_id;

  -- 3. Calculate team scores using CTE
  -- Note: Average Judge Score is arithmetic mean of submitted judge normalized scores (0-100)
  -- Investment Score = (Points Received / Highest Points Received) * 100 (or 0 if highest = 0)
  -- Final Score = (Average Judge Score * W_judge/100) + (Investment Score * W_invest/100)
  -- Precision: exact numeric calculation, rounded to 2 decimals for storage, sorted deterministically
  for v_r in
    with judge_eval_scores as (
      select
        ev.team_id,
        ev.judge_id,
        round(coalesce(sum((es.score / c.max_score) * c.weight), 0), 2) as judge_score
      from public.evaluations ev
      join public.evaluation_scores es on es.evaluation_id = ev.id
      join public.criteria c on c.id = es.criterion_id
      where ev.status = 'submitted' and c.is_active = true
      group by ev.team_id, ev.judge_id
    ),
    team_averages as (
      select
        t.id as team_id,
        t.name as team_name,
        coalesce(avg(jes.judge_score), 0.00) as raw_avg_judge_score,
        coalesce(sum(inv.amount), 0) as points_received
      from public.teams t
      left join judge_eval_scores jes on jes.team_id = t.id
      left join public.investments inv on inv.target_team_id = t.id
      where t.is_active = true
      group by t.id, t.name
    ),
    computed_scores as (
      select
        team_id,
        team_name,
        raw_avg_judge_score,
        round(raw_avg_judge_score, 2) as display_avg_judge,
        points_received,
        case
          when v_max_investment = 0 then 0.00
          else (points_received::numeric / v_max_investment::numeric) * 100.00
        end as raw_invest_score,
        case
          when v_max_investment = 0 then 0.00
          else round((points_received::numeric / v_max_investment::numeric) * 100.00, 2)
        end as display_invest_score,
        -- Final Score = (avg_judge * w_judge / 100) + (invest_score * w_invest / 100)
        (
          (raw_avg_judge_score * (v_event.weight_judge / 100.00)) +
          (
            case when v_max_investment = 0 then 0.00
            else ((points_received::numeric / v_max_investment::numeric) * 100.00) end
            * (v_event.weight_invest / 100.00)
          )
        ) as raw_final_score
      from team_averages
    )
    select
      team_id,
      team_name,
      display_avg_judge,
      points_received,
      display_invest_score,
      round(raw_final_score, 2) as display_final_score,
      raw_final_score,
      raw_avg_judge_score
    from computed_scores
    order by
      raw_final_score desc,
      raw_avg_judge_score desc,
      points_received desc,
      lower(team_name) asc,
      team_id asc
  loop
    -- Tie-break handling for displayed rank: share rank only if equal on criteria 1-3
    if v_current_rank = 1 then
      v_display_rank := 1;
    elsif v_r.display_final_score = v_prev_final and v_r.display_avg_judge = v_prev_judge and v_r.points_received = v_prev_points then
      -- Same shared rank
    else
      v_display_rank := v_current_rank;
    end if;

    v_prev_final := v_r.display_final_score;
    v_prev_judge := v_r.display_avg_judge;
    v_prev_points := v_r.points_received;

    insert into public.result_rows (
      snapshot_id,
      team_id,
      avg_judge_score,
      points_received,
      investment_score,
      final_score,
      rank
    ) values (
      v_snapshot_id,
      v_r.team_id,
      v_r.display_avg_judge,
      v_r.points_received,
      v_r.display_invest_score,
      v_r.display_final_score,
      v_display_rank
    );

    v_current_rank := v_current_rank + 1;
  end loop;

  -- 4. If publishing, transition event stage and log audit
  if p_is_published then
    update public.events
    set stage = 'PUBLISHED',
        updated_at = now();

    insert into public.audit_logs (
      actor_id,
      action,
      entity,
      entity_id,
      details
    ) values (
      auth.uid(),
      'PUBLISH_RESULTS',
      'results_snapshots',
      v_snapshot_id::text,
      jsonb_build_object(
        'snapshot_id', v_snapshot_id,
        'highest_investment_points', v_max_investment,
        'weight_judge', v_event.weight_judge,
        'weight_invest', v_event.weight_invest
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'is_published', p_is_published,
    'highest_investment_points', v_max_investment
  );
end;
$$;
