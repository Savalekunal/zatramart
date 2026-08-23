-- ZatraMart — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run only if tables don't already exist (uses plain CREATE, not IF NOT EXISTS,
-- so it errors loudly on a second run instead of silently skipping — that's intentional).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  mobile text unique not null,
  email text not null,
  role text not null default '🌾 Kisan',
  created_at timestamptz not null default now()
);

create table addresses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  phone text,
  line text,
  pincode text,
  city text,
  state text,
  type text,
  created_at timestamptz not null default now()
);

create table orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  subtotal numeric,
  delivery numeric,
  cod_charge numeric,
  total numeric,
  address jsonb,
  payment_method text,
  status text not null default 'Placed',
  tracking jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;

-- Each user can only ever read/write their own row.
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own addresses" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own orders" on orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lets the login screen resolve "mobile number" -> "email" (Supabase OTP is email-based)
-- without exposing the rest of the profiles table. Returns null if the mobile isn't registered.
create or replace function get_email_by_mobile(p_mobile text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles where mobile = p_mobile limit 1;
$$;

grant execute on function get_email_by_mobile(text) to anon;
