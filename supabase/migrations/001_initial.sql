-- HomeOS initial cloud schema. Safe to run repeatedly.
create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  owner_id uuid not null references auth.users(id) on delete restrict,
  avatar_url text,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in('owner','admin','member','child')), joined_at timestamptz not null default now(), unique(household_id,user_id)
);
create table if not exists public.shopping_lists (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.shopping_items (
  id text primary key, list_id text not null references public.shopping_lists(id) on delete cascade, name text not null, quantity numeric not null default 1, unit text, category text, store text, estimated_price numeric, note text, barcode text, checked boolean not null default false, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.pantry_items (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null, quantity numeric not null default 1, unit text, minimum_quantity numeric not null default 0, category text, storage_location text, barcode text, expiry_date date, purchase_price numeric, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.tasks (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, title text not null, description text, room text, assigned_to uuid references auth.users(id) on delete set null, priority text, due_date timestamptz, recurrence text, completed boolean not null default false, completed_at timestamptz, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.transactions (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, type text not null check(type in('expense','income')), amount numeric not null check(amount>=0), category text not null, title text not null, date date not null, paid_by uuid references auth.users(id) on delete set null, note text, receipt_url text, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.bills (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, title text not null, provider text, amount numeric not null default 0, due_date date not null, recurring boolean not null default false, recurrence text, status text not null check(status in('open','paid','overdue')), category text, document_url text, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.devices (
  id text primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null, manufacturer text, model text, serial_number text, purchase_date date, purchase_price numeric, warranty_until date, location text, photo_url text, invoice_url text, manual_url text, notes text, created_at timestamptz not null, updated_at timestamptz not null
);

create or replace function public.is_household_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.household_members hm where hm.household_id=target and hm.user_id=auth.uid());
$$;
create or replace function public.list_household_for_list(target text) returns uuid language sql stable security definer set search_path=public as $$
  select household_id from public.shopping_lists where id=target limit 1;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.pantry_items enable row level security;
alter table public.tasks enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.devices enable row level security;

drop policy if exists households_member_select on public.households;
drop policy if exists households_owner_insert on public.households;
drop policy if exists members_visible_to_members on public.household_members;
drop policy if exists members_owner_insert on public.household_members;
drop policy if exists members_owner_update on public.household_members;
drop policy if exists lists_member_all on public.shopping_lists;
drop policy if exists items_member_all on public.shopping_items;
drop policy if exists pantry_member_all on public.pantry_items;
drop policy if exists tasks_member_all on public.tasks;
drop policy if exists tx_member_all on public.transactions;
drop policy if exists bills_member_all on public.bills;
drop policy if exists devices_member_all on public.devices;

create policy households_member_select on public.households for select using (public.is_household_member(id) or owner_id=auth.uid());
create policy households_owner_insert on public.households for insert with check (owner_id=auth.uid());
create policy members_visible_to_members on public.household_members for select using (public.is_household_member(household_id));
create policy members_owner_insert on public.household_members for insert with check (exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()) and user_id=auth.uid());
create policy members_owner_update on public.household_members for update using (exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy lists_member_all on public.shopping_lists for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy items_member_all on public.shopping_items for all using (public.is_household_member(public.list_household_for_list(list_id))) with check (public.is_household_member(public.list_household_for_list(list_id)));
create policy pantry_member_all on public.pantry_items for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy tasks_member_all on public.tasks for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy tx_member_all on public.transactions for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy bills_member_all on public.bills for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy devices_member_all on public.devices for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create index if not exists shopping_lists_household_idx on public.shopping_lists(household_id);
create index if not exists pantry_household_idx on public.pantry_items(household_id);
create index if not exists tasks_household_due_idx on public.tasks(household_id,due_date);
create index if not exists transactions_household_date_idx on public.transactions(household_id,date);
