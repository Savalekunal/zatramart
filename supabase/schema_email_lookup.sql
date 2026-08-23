-- ZatraMart — lets the signup form check "is this email already registered?"
-- Mirrors the existing get_email_by_mobile RPC, just reversed.
-- Run this ONCE in Supabase SQL Editor.

create or replace function get_mobile_by_email(p_email text)
returns text
language sql
security definer
set search_path = public
as $$
  select mobile from profiles where email = p_email limit 1;
$$;

grant execute on function get_mobile_by_email(text) to anon;

notify pgrst, 'reload schema';
