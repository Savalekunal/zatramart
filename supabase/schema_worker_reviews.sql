-- Real reviews on Majdoor worker profiles (one review per reviewer per worker; editing a
-- review just overwrites the old one via upsert on the unique pair below).
create table worker_reviews (
  id text primary key,
  worker_id text not null references worker_profiles(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (worker_id, reviewer_id)
);

alter table worker_reviews enable row level security;

create policy "public read worker_reviews" on worker_reviews for select using (true);
create policy "own insert worker_reviews" on worker_reviews for insert with check (auth.uid() = reviewer_id);
create policy "own update worker_reviews" on worker_reviews for update using (auth.uid() = reviewer_id);
create policy "own delete worker_reviews" on worker_reviews for delete using (auth.uid() = reviewer_id);

notify pgrst, 'reload schema';
