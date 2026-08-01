-- Personal Finance Planner — Supabase schema + Row Level Security.
-- Run this once in the Supabase project: SQL Editor → New query → paste → Run.
-- Every table is isolated per user: a user can only ever see/change their own rows.

-- Amounts are stored as integer minor units (e.g. kopiykas/cents).
-- created_at is a bigint epoch (ms), matching the client's Date.now() values.

-- ---------- profiles (per-user settings) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text default '',
  base_currency text not null default 'UAH',
  exchange_rates jsonb not null default '{"UAH":1,"USD":41,"EUR":45}',
  emergency_target_months int not null default 3,
  onboarded boolean not null default false
);

-- ---------- accounts ----------
create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  initial_balance bigint not null default 0,
  currency text not null,
  is_savings boolean not null default false,
  created_at bigint not null
);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  kind text not null,               -- 'income' | 'expense'
  created_at bigint not null
);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  type text not null,               -- 'income' | 'expense' | 'transfer'
  amount bigint not null,
  date text not null,               -- 'YYYY-MM-DD'
  note text,
  account_id uuid,
  category_id uuid,
  from_account_id uuid,
  to_account_id uuid,
  to_amount bigint,
  plan_item_id uuid,
  created_at bigint not null
);

-- ---------- plan_templates ----------
create table if not exists public.plan_templates (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  name text not null,
  amount bigint not null,
  category_id uuid,
  cadence text not null,            -- 'monthly' | 'quarterly'
  probability int,
  due_day int,
  start_month text not null,        -- 'YYYY-MM'
  active boolean not null default true,
  created_at bigint not null
);

-- ---------- plan_items ----------
create table if not exists public.plan_items (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  month text not null,              -- 'YYYY-MM'
  kind text not null,
  name text not null,
  amount bigint not null,
  category_id uuid,
  probability int,
  due_day int,
  template_id uuid,
  created_at bigint not null
);

-- ---------- plan_months (materialized months) ----------
create table if not exists public.plan_months (
  user_id uuid not null references auth.users on delete cascade,
  month text not null,              -- 'YYYY-MM'
  created_at bigint not null,
  primary key (user_id, month)
);

-- ---------- weekly_budgets ----------
create table if not exists public.weekly_budgets (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  week_start text not null,         -- 'YYYY-MM-DD' (Monday)
  limits jsonb not null default '[]',
  created_at bigint not null
);

-- ---------- savings_goals ----------
create table if not exists public.savings_goals (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  currency text not null,
  target bigint not null,
  saved bigint not null default 0,
  created_at bigint not null
);

-- ---------- monthly_reports (month closing) ----------
create table if not exists public.monthly_reports (
  user_id uuid not null references auth.users on delete cascade,
  month text not null,
  report jsonb not null,
  closed_at text not null,
  primary key (user_id, month)
);

-- ===================== Row Level Security =====================
-- Enable RLS and add an owner-only policy for every table.

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','categories','transactions','plan_templates','plan_items',
    'plan_months','weekly_budgets','savings_goals','monthly_reports'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy "owner_all_%1$s" on public.%1$I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- profiles uses id (= auth user id) instead of a user_id column.
alter table public.profiles enable row level security;
create policy "owner_all_profiles" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create a profile row automatically for each new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
