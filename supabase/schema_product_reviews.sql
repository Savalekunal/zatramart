-- Real reviews on Shop catalog products (one review per reviewer per product; editing a
-- review just overwrites the old one via upsert on the unique pair below). Mirrors the
-- worker_reviews table used for Majdoor profiles.
create table product_reviews (
  id text primary key,
  product_id text not null,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (product_id, reviewer_id)
);

alter table product_reviews enable row level security;

create policy "public read product_reviews" on product_reviews for select using (true);
create policy "own insert product_reviews" on product_reviews for insert with check (auth.uid() = reviewer_id);
create policy "own update product_reviews" on product_reviews for update using (auth.uid() = reviewer_id);
create policy "own delete product_reviews" on product_reviews for delete using (auth.uid() = reviewer_id);

notify pgrst, 'reload schema';
