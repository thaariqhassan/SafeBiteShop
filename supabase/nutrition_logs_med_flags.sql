-- SafeBite: store medication × food interaction flags on each diary entry.
-- Lets the food diary and the exported health report show which logged foods
-- interact with the profile's medications (computed at log time, since the
-- product's ingredients aren't kept on the log row).
-- Run this once in the Supabase SQL editor.

alter table public.nutrition_logs
  add column if not exists med_flags jsonb;
