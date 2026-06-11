# Crafty Cubs — Deployment Guide
## All your real values are already filled in below — just copy/paste!

---

## Step 1 — Set up Supabase Storage (for profile pictures)

1. Go to **supabase.com** → your crafty-cubs project
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Name: `profiles` → tick **Public** → Create

---

## Step 2 — Upload to GitHub

1. Go to **github.com** → sign up free if needed
2. Click **+** → **New repository** → name it `crafty-cubs` → Create
3. Click **uploading an existing file**
4. Drag the entire unzipped `crafty-cubs` folder contents in
5. Click **Commit changes**

---

## Step 3 — Deploy on Netlify

1. Go to **netlify.com** → **Add new site** → **Import from Git**
2. Connect GitHub, choose `crafty-cubs`
3. Build command: `npm run build` (auto-filled)
4. Publish directory: `build` (auto-filled)
5. Click **Deploy site**

---

## Step 4 — Add Environment Variables IMPORTANT

Go to Netlify → Site settings → Environment variables → Add variable

Add ALL of these one by one:

Key: REACT_APP_SUPABASE_URL
Value: https://khfhguigpjiybaggglcv.supabase.co

Key: REACT_APP_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZmhndWlncGppeWJhZ2dnbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTk1OTIsImV4cCI6MjA5MDk3NTU5Mn0.20N7zzuphvc2jEjRUnRPZruvqeEWfL9UqIwxeLno4sg

Key: GOOGLE_SHEETS_ID
Value: 1D8VZvrc9ed6Unti-jPwoYEDYMFY2LCJRTznUZAuyLE8

Key: GOOGLE_CLIENT_EMAIL
Value: crafty-cubs-sheets@crafty-cubs.iam.gserviceaccount.com

Key: GOOGLE_PRIVATE_KEY
Value: [Paste your full private key — the entire -----BEGIN PRIVATE KEY----- block]

After adding all 5 → Deploys tab → Trigger deploy → Deploy site

---

## Step 5 — First login

Open your Netlify URL and log in with:
- rumanaifthikar99@gmail.com
- thamanamahuroof96@gmail.com
Using the password you set in Supabase → Authentication → Users

First login shows the setup wizard — enter CC and 351

---

## Step 6 — Sync Google Sheets

1. Click Finance tab
2. Click Sync Sheet button
3. All historical data loads in

---

## SQL to run in Supabase (if not done yet)

Go to Supabase → SQL Editor and run:

create table if not exists customers (id uuid primary key default gen_random_uuid(), name text not null, phone text, email text, address text, notes text, custom_fields jsonb default '[]', created_at timestamptz default now());
create table if not exists invoices (id uuid primary key default gen_random_uuid(), invoice_number text not null, date date not null, customer_id uuid references customers(id), customer_name text, customer_phone text, customer_email text, customer_address text, items jsonb default '[]', subtotal numeric default 0, discount_type text default 'fixed', discount numeric default 0, discount_amt numeric default 0, delivery numeric default 0, total numeric default 0, status text default 'unpaid', amount_paid numeric default 0, notes text, terms text, bank_account_name text, bank_account text, bank_name text, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists events (id uuid primary key default gen_random_uuid(), name text not null, date date, notes text, linked_invoice_id uuid references invoices(id), items jsonb default '[]', total_expenses numeric default 0, created_at timestamptz default now());
create table if not exists settings (id text primary key default 'global', data jsonb not null default '{}');
create table if not exists finance_cache (id text primary key default 'sheets', data jsonb not null default '{}', synced_at timestamptz default now());

alter table customers enable row level security;
alter table invoices enable row level security;
alter table events enable row level security;
alter table settings enable row level security;
alter table finance_cache enable row level security;

create policy "auth only" on customers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth only" on invoices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth only" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth only" on settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth only" on finance_cache for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
