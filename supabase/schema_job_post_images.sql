-- ZatraMart — adds photo/video upload to job_posts
-- Run this ONCE in Supabase SQL Editor (job_posts already exists, so this is an ALTER, not CREATE).

alter table job_posts add column images text[] not null default '{}';

notify pgrst, 'reload schema';
