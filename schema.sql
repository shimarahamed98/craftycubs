-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CUSTOMERS
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  custom_fields jsonb default '[]',
  created_at timestamptz default now()
);

-- INVOICES (with audit trail)
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text unique not null,
  date text,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  items jsonb default '[]',
  subtotal numeric default 0,
  discount_type text default 'fixed',
  discount numeric default 0,
  discount_amt numeric default 0,
  delivery numeric default 0,
  total numeric default 0,
  status text default 'unpaid',
  amount_paid numeric default 0,
  notes text,
  terms text,
  bank_account_name text,
  bank_account text,
  bank_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INVOICE HISTORY (full audit log)
create table if not exists invoice_history (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade,
  action text not null, -- 'created', 'updated', 'status_changed', 'deleted'
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_email text,
  snapshot jsonb,
  note text,
  created_at timestamptz default now()
);

-- EVENTS / EXPENSES
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date text,
  notes text,
  linked_invoice_id uuid references invoices(id) on delete set null,
  items jsonb default '[]',
  total_expenses numeric default 0,
  created_at timestamptz default now()
);

-- SETTINGS (single global row)
create table if not exists settings (
  id text primary key default 'global',
  data jsonb default '{}'
);

-- DRAFTS
create table if not exists drafts (
  id text primary key,
  data jsonb default '{}',
  invoice_number text,
  customer_name text,
  created_by uuid references auth.users(id) on delete cascade,
  saved_at timestamptz default now()
);

-- FINANCE CACHE
create table if not exists finance_cache (
  id text primary key default 'sheets',
  data jsonb default '{}',
  synced_at timestamptz default now()
);

-- ── RLS POLICIES ───────────────────────────────────────────────────

alter table customers enable row level security;
alter table invoices enable row level security;
alter table invoice_history enable row level security;
alter table events enable row level security;
alter table settings enable row level security;
alter table drafts enable row level security;
alter table finance_cache enable row level security;

-- Customers: authenticated users only
create policy "auth_all_customers" on customers to authenticated using (true) with check (true);

-- Invoices: authenticated users only
create policy "auth_all_invoices" on invoices to authenticated using (true) with check (true);

-- Invoice history: authenticated users only
create policy "auth_all_invoice_history" on invoice_history to authenticated using (true) with check (true);

-- Events: authenticated users only
create policy "auth_all_events" on events to authenticated using (true) with check (true);

-- Settings: authenticated users only
create policy "auth_all_settings" on settings to authenticated using (true) with check (true);

-- Drafts: each user sees only their own drafts
create policy "auth_own_drafts" on drafts to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Finance cache: authenticated users only
create policy "auth_all_finance_cache" on finance_cache to authenticated using (true) with check (true);

-- ── FUNCTION: auto-update updated_at ──────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger invoices_updated_at before update on invoices
for each row execute function update_updated_at();

-- ── STORAGE: avatars bucket ────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true) on conflict do nothing;
create policy "auth_profile_storage" on storage.objects to authenticated using (bucket_id = 'profiles') with check (bucket_id = 'profiles');

