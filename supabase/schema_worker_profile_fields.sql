-- ZatraMart — adds Age + Profile Photo to worker_profiles
-- Run this ONCE in Supabase SQL Editor (worker_profiles already exists from the previous script,
-- so this uses ALTER TABLE, not CREATE TABLE).

alter table worker_profiles add column age int;
alter table worker_profiles add column photo_url text;

-- Same reason as before: PostgREST caches the schema, so new columns need a manual nudge
-- to be visible immediately instead of waiting for the next automatic refresh.
notify pgrst, 'reload schema';
