-- The original seller_profiles policies only covered select/insert/update — there was no way
-- to delete a store profile (e.g. if someone set one up by mistake while testing).
create policy "own delete seller_profiles" on seller_profiles for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
