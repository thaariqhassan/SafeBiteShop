-- SafeBite: shopkeeper inventory table
-- Run this once in the Supabase SQL editor.

create table if not exists public.shop_products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  price       numeric not null default 0,
  stock_count integer not null default 0,
  rating      numeric not null default 0,
  expiry      date,
  image_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists shop_products_owner_idx
  on public.shop_products (owner_id);

-- Row Level Security: a shopkeeper can only see and manage their own products.
alter table public.shop_products enable row level security;

drop policy if exists "shop_products_select_own" on public.shop_products;
create policy "shop_products_select_own"
  on public.shop_products for select
  using (auth.uid() = owner_id);

drop policy if exists "shop_products_insert_own" on public.shop_products;
create policy "shop_products_insert_own"
  on public.shop_products for insert
  with check (auth.uid() = owner_id);

drop policy if exists "shop_products_update_own" on public.shop_products;
create policy "shop_products_update_own"
  on public.shop_products for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "shop_products_delete_own" on public.shop_products;
create policy "shop_products_delete_own"
  on public.shop_products for delete
  using (auth.uid() = owner_id);
