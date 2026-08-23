-- ZatraMart — Seller business profile ("Become a Seller")
-- Run this ONCE in Supabase SQL Editor.

create table seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seller_type text not null default 'individual',   -- 'individual' | 'business'
  display_name text not null unique,
  description text,
  gstin text,                                        -- required only when seller_type = 'business'
  categories text[] not null default '{}',
  pickup_line text not null,
  pickup_city text not null,
  pickup_state text not null,
  pickup_pincode text not null,
  created_at timestamptz not null default now()
);

alter table seller_profiles enable row level security;

create policy "public read seller_profiles" on seller_profiles for select using (true);
create policy "own insert seller_profiles" on seller_profiles for insert with check (auth.uid() = user_id);
create policy "own update seller_profiles" on seller_profiles for update using (auth.uid() = user_id);

notify pgrst, 'reload schema';
