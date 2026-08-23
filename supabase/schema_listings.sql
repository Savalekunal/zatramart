-- ZatraMart — Bazaar listings + Seller products + Enquiries + photo storage
-- Run this ONCE in Supabase Dashboard → SQL Editor, AFTER schema.sql has already been run.
-- (Same convention as schema.sql: plain CREATE, errors loudly on a second run instead of
-- silently skipping — that's intentional, don't add IF NOT EXISTS.)

/* ---------- Bazaar (OLX-style classifieds) — real user-posted ads ---------- */
create table bazaar_listings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cat text not null,
  type text not null default 'sell',        -- 'sell' | 'rent'
  rent_unit boolean not null default false,
  price numeric not null,
  loc text not null,
  meta text,
  condition text,                           -- 'New' | 'Like New' | 'Good' | 'Fair' | 'Used'
  negotiable boolean not null default true,
  status text not null default 'active',    -- 'active' | 'paused' | 'sold' | 'rented'
  images text[] not null,
  seller_name text,
  seller_phone text,
  created_at timestamptz not null default now()
);

/* ---------- Seller-submitted catalog products (from "Seller Bane") ---------- */
create table seller_products (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cat text not null,
  price numeric not null,
  description text,
  condition text,
  negotiable boolean not null default true,
  status text not null default 'active',    -- 'active' | 'paused' | 'sold'
  images text[] not null,
  seller_name text,
  seller_phone text,
  created_at timestamptz not null default now()
);

/* ---------- Majdoor Sewa: farmer job posts ("+ Job Post Karein") ---------- */
create table job_posts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,                   -- worker skill key, e.g. 'harvesting'
  workers_needed int not null default 1,
  daily_wage numeric not null,
  start_date date not null,
  total_days int not null default 1,
  food_provided boolean not null default false,
  transport_provided boolean not null default false,
  description text,
  village text,
  district text not null,
  images text[] not null default '{}',      -- optional photos/videos of the field or work site
  status text not null default 'open',      -- 'open' | 'fulfilled' | 'closed'
  farmer_name text,
  farmer_phone text,
  created_at timestamptz not null default now()
);

/* ---------- Majdoor Sewa: worker/contractor profiles ("Majdoor Ban Ke Register Karein") ---------- */
create table worker_profiles (
  id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  age int,
  photo_url text,
  primary_skill text not null,
  secondary_skills text[] not null default '{}',
  experience_years int not null default 1,
  daily_rate numeric not null,
  is_group_leader boolean not null default false,
  group_size int not null default 1,
  status text not null default 'available', -- 'available' | 'busy' | 'inactive'
  district text not null,
  worker_phone text,
  created_at timestamptz not null default now()
);

/* ---------- Buyer/farmer enquiries on a listing/product/job/worker ("Contact") ---------- */
create table enquiries (
  id text primary key,
  listing_type text not null,               -- 'bazaar' | 'product' | 'job' | 'worker'
  listing_id text not null,
  listing_name text not null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table bazaar_listings enable row level security;
alter table seller_products enable row level security;
alter table job_posts enable row level security;
alter table worker_profiles enable row level security;
alter table enquiries enable row level security;

-- Anyone (including logged-out visitors) can browse listings; only the owner can create/edit/delete theirs.
create policy "public read bazaar_listings" on bazaar_listings for select using (true);
create policy "own insert bazaar_listings" on bazaar_listings for insert with check (auth.uid() = user_id);
create policy "own update bazaar_listings" on bazaar_listings for update using (auth.uid() = user_id);
create policy "own delete bazaar_listings" on bazaar_listings for delete using (auth.uid() = user_id);

create policy "public read seller_products" on seller_products for select using (true);
create policy "own insert seller_products" on seller_products for insert with check (auth.uid() = user_id);
create policy "own update seller_products" on seller_products for update using (auth.uid() = user_id);
create policy "own delete seller_products" on seller_products for delete using (auth.uid() = user_id);

create policy "public read job_posts" on job_posts for select using (true);
create policy "own insert job_posts" on job_posts for insert with check (auth.uid() = user_id);
create policy "own update job_posts" on job_posts for update using (auth.uid() = user_id);
create policy "own delete job_posts" on job_posts for delete using (auth.uid() = user_id);

create policy "public read worker_profiles" on worker_profiles for select using (true);
create policy "own insert worker_profiles" on worker_profiles for insert with check (auth.uid() = user_id);
create policy "own update worker_profiles" on worker_profiles for update using (auth.uid() = user_id);
create policy "own delete worker_profiles" on worker_profiles for delete using (auth.uid() = user_id);

-- Only the buyer who sent it or the seller who received it can read an enquiry; only the buyer can create one.
create policy "buyer or seller read enquiries" on enquiries
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "buyer insert enquiries" on enquiries
  for insert with check (auth.uid() = buyer_id);

/* ---------- Storage bucket for real photos uploaded by users ---------- */
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "public read listing-photos" on storage.objects
  for select using (bucket_id = 'listing-photos');
create policy "authenticated upload listing-photos" on storage.objects
  for insert with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');
create policy "own delete listing-photos" on storage.objects
  for delete using (bucket_id = 'listing-photos' and owner = auth.uid());
