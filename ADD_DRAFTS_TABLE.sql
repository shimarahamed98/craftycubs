-- Run this in Supabase SQL Editor to add drafts support
create table if not exists drafts (
  id text primary key,
  data jsonb not null default '{}',
  invoice_number text,
  customer_name text,
  saved_at timestamptz default now()
);

alter table drafts enable row level security;
create policy "auth only" on drafts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
