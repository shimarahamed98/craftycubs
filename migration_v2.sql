-- Run this in Supabase SQL editor to add payments, templates, and fix drafts RLS

-- PAYMENTS table
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric not null default 0,
  note text,
  method text default 'bank',
  created_at timestamptz default now()
);

-- INVOICE TEMPLATES table
create table if not exists invoice_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  data jsonb not null default '{}',
  created_by uuid,
  created_at timestamptz default now()
);

-- FINANCE ENTRIES table (if not already created)
create table if not exists finance_entries (
  id uuid primary key default uuid_generate_v4(),
  person text not null,
  type text not null,
  amount numeric not null default 0,
  note text,
  month int,
  year int,
  created_by uuid,
  created_by_email text,
  created_at timestamptz default now()
);

-- EVENTS: add invoice_id column if missing
alter table events add column if not exists invoice_id uuid references invoices(id) on delete set null;

-- Enable RLS on new tables
alter table payments enable row level security;
alter table invoice_templates enable row level security;
alter table finance_entries enable row level security;

-- RLS policies — all authenticated users can read/write all rows
create policy "auth_payments" on payments
  to authenticated using (true) with check (true);

create policy "auth_templates" on invoice_templates
  to authenticated using (true) with check (true);

create policy "auth_finance" on finance_entries
  to authenticated using (true) with check (true);

-- FIX DRAFTS: drop old policy and allow all authenticated users to see all drafts
drop policy if exists "auth_own_drafts" on drafts;
drop policy if exists "auth_all_drafts" on drafts;
create policy "auth_all_drafts" on drafts
  to authenticated using (true) with check (true);
