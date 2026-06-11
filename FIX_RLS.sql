-- Run this in Supabase SQL Editor to fix data not saving
-- This drops old policies and recreates them properly

drop policy if exists "auth only" on customers;
drop policy if exists "auth only" on invoices;
drop policy if exists "auth only" on events;
drop policy if exists "auth only" on settings;
drop policy if exists "auth only" on finance_cache;
drop policy if exists "auth users only" on customers;
drop policy if exists "auth users only" on invoices;
drop policy if exists "auth users only" on events;
drop policy if exists "auth users only" on settings;
drop policy if exists "auth users only" on finance_cache;
drop policy if exists "allow all" on customers;
drop policy if exists "allow all" on invoices;
drop policy if exists "allow all" on events;
drop policy if exists "allow all" on settings;
drop policy if exists "allow all" on finance_cache;

-- Recreate with correct authenticated user check
create policy "allow_authenticated" on customers for all to authenticated using (true) with check (true);
create policy "allow_authenticated" on invoices for all to authenticated using (true) with check (true);
create policy "allow_authenticated" on events for all to authenticated using (true) with check (true);
create policy "allow_authenticated" on settings for all to authenticated using (true) with check (true);
create policy "allow_authenticated" on finance_cache for all to authenticated using (true) with check (true);

-- Drafts table (in case it needs the policy too)
drop policy if exists "auth only" on drafts;
drop policy if exists "allow_authenticated" on drafts;
create policy "allow_authenticated" on drafts for all to authenticated using (true) with check (true);
