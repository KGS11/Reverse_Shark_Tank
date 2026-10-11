-- ==============================================================================
-- seed.sql
-- Digital Reverse Shark Tank - Default Event and Evaluation Criteria
-- ==============================================================================

-- 1. Insert Default Event if not present
insert into public.events (id, name, stage, initial_balance, weight_judge, weight_invest, reveal_received_totals)
values (
  '00000000-0000-0000-0000-000000000001',
  'Digital Reverse Shark Tank 2026',
  'SETUP',
  1000,
  60.00,
  40.00,
  false
)
on conflict (id) do nothing;

-- 2. Insert Default 5 Criteria (Equal 20% weights, max score 10)
insert into public.criteria (id, name, description, max_score, weight, sort_order, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Problem Analysis', 'Depth of analysis into why the company failed, root cause diagnosis, and market dynamics.', 10.00, 20.00, 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Recovery Strategy Quality', 'Innovativeness, clarity, and structural validity of the proposed turnaround plan.', 10.00, 20.00, 2, true),
  ('10000000-0000-0000-0000-000000000003', 'Feasibility & Execution', 'Practicality of execution, timeline realism, risk mitigation, and operational roadmap.', 10.00, 20.00, 3, true),
  ('10000000-0000-0000-0000-000000000004', 'Financial & Market Reasoning', 'Capital efficiency, realistic revenue modeling, unit economics, and market capture.', 10.00, 20.00, 4, true),
  ('10000000-0000-0000-0000-000000000005', 'Presentation & Q&A Defensibility', 'Pitch clarity, visual storytelling, responsiveness to counter-arguments and judge scrutiny.', 10.00, 20.00, 5, true)
on conflict (id) do nothing;
