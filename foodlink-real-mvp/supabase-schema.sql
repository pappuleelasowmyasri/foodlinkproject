-- FOODLINK DATABASE
-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.user_role as enum ('provider','organization','admin');
create type public.food_status as enum ('available','claimed','completed','expired','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'organization',
  phone text,
  address text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.food_listings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  food_name text not null,
  food_type text not null,
  quantity text not null,
  location text not null,
  pickup_deadline timestamptz not null,
  prepared_at timestamptz,
  notes text,
  status public.food_status not null default 'available',
  created_at timestamptz not null default now()
);

create table public.food_claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.food_listings(id) on delete cascade,
  organization_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'claimed' check(status in ('claimed','pickup_confirmed','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique(listing_id)
);

alter table public.profiles enable row level security;
alter table public.food_listings enable row level security;
alter table public.food_claims enable row level security;

create policy "profiles readable by authenticated users" on public.profiles
for select to authenticated using (true);

create policy "users create own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy "users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "available listings readable" on public.food_listings
for select to authenticated using (
  status = 'available' or provider_id = auth.uid()
);

create policy "providers create own listings" on public.food_listings
for insert to authenticated with check (
  provider_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='provider')
);

create policy "providers update own listings" on public.food_listings
for update to authenticated using (provider_id=auth.uid()) with check (provider_id=auth.uid());

create policy "claims visible to participants" on public.food_claims
for select to authenticated using (
  organization_id=auth.uid()
  or exists(select 1 from public.food_listings f where f.id=listing_id and f.provider_id=auth.uid())
);

-- Claiming is done through this function so two organizations cannot claim
-- the same listing at the same time.
create or replace function public.claim_food(listing_id uuid)
returns json
language plpgsql
security definer
set search_path=public
as $$
declare
  l food_listings;
  claim_id uuid;
begin
  select * into l from food_listings where id=listing_id for update;

  if l.id is null then raise exception 'Listing not found'; end if;
  if l.status <> 'available' then raise exception 'This food has already been claimed or is no longer available'; end if;
  if l.pickup_deadline <= now() then raise exception 'Pickup deadline has passed'; end if;
  if not exists(select 1 from profiles where id=auth.uid() and role='organization') then
    raise exception 'Only organization accounts can claim food';
  end if;

  insert into food_claims(listing_id,organization_id) values(l.id,auth.uid()) returning id into claim_id;
  update food_listings set status='claimed' where id=l.id;
  return json_build_object('claim_id',claim_id,'listing_id',l.id);
end;
$$;

revoke all on function public.claim_food(uuid) from public;
grant execute on function public.claim_food(uuid) to authenticated;

-- Automatically mark old available listings as expired.
create or replace function public.expire_old_food()
returns void
language sql
security definer
set search_path=public
as $$
  update public.food_listings
  set status='expired'
  where status='available' and pickup_deadline <= now();
$$;
