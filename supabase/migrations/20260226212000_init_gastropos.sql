-- GastroPOS multi-tenant schema (Supabase/PostgreSQL)
-- Enable required extension for UUID generation.
create extension if not exists pgcrypto;

-- Tenants
create table if not exists tenant (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Users (linked to Supabase auth.users)
create table if not exists app_user (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenant(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now()
);

-- Catalog
create table if not exists category (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists product (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  category_id uuid not null references category(id) on delete restrict,
  name text not null,
  base_price numeric(12,2) not null check (base_price >= 0),
  is_weighable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists modifier_group (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  name text not null,
  min_select int not null default 0,
  max_select int not null default 1 check (max_select >= min_select),
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists modifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  modifier_group_id uuid not null references modifier_group(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, modifier_group_id, name)
);

-- Join table between product and modifier_group
create table if not exists product_modifier_group (
  tenant_id uuid not null references tenant(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  modifier_group_id uuid not null references modifier_group(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, modifier_group_id)
);

-- Sales
create table if not exists "order" (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  status text not null default 'paid' check (status in ('draft', 'paid', 'cancelled')),
  payment_method text not null check (payment_method in ('cash', 'card', 'qr')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax numeric(12,2) not null check (tax >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_item (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  order_id uuid not null references "order"(id) on delete cascade,
  client_line_id text not null,
  product_id uuid references product(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  qty numeric(12,3) not null check (qty > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_item_modifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  order_item_id uuid not null references order_item(id) on delete cascade,
  modifier_name_snapshot text not null,
  price_delta_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cash_shift_close (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  ticket_count int not null check (ticket_count >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  synced_count int not null check (synced_count >= 0),
  pending_count int not null check (pending_count >= 0),
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_category_tenant on category(tenant_id);
create index if not exists idx_product_tenant on product(tenant_id);
create index if not exists idx_modifier_group_tenant on modifier_group(tenant_id);
create index if not exists idx_modifier_tenant on modifier(tenant_id);
create index if not exists idx_order_tenant_created on "order"(tenant_id, created_at desc);
create index if not exists idx_order_item_order on order_item(order_id);
create unique index if not exists idx_order_item_client_line on order_item(order_id, client_line_id);
create index if not exists idx_shift_close_tenant_closed on cash_shift_close(tenant_id, closed_at desc);

-- Helper function for tenant context from JWT
create or replace function current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

alter table tenant enable row level security;
alter table app_user enable row level security;
alter table category enable row level security;
alter table product enable row level security;
alter table modifier_group enable row level security;
alter table modifier enable row level security;
alter table product_modifier_group enable row level security;
alter table "order" enable row level security;
alter table order_item enable row level security;
alter table order_item_modifier enable row level security;
alter table cash_shift_close enable row level security;

-- Tenant visibility policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'tenant' and policyname = 'tenant_select_self') then
    create policy tenant_select_self on tenant
    for select using (id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'app_user' and policyname = 'app_user_tenant_policy') then
    create policy app_user_tenant_policy on app_user
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'category' and policyname = 'category_tenant_policy') then
    create policy category_tenant_policy on category
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'product' and policyname = 'product_tenant_policy') then
    create policy product_tenant_policy on product
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modifier_group' and policyname = 'modifier_group_tenant_policy') then
    create policy modifier_group_tenant_policy on modifier_group
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modifier' and policyname = 'modifier_tenant_policy') then
    create policy modifier_tenant_policy on modifier
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'product_modifier_group' and policyname = 'product_modifier_group_tenant_policy') then
    create policy product_modifier_group_tenant_policy on product_modifier_group
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order' and policyname = 'order_tenant_policy') then
    create policy order_tenant_policy on "order"
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order_item' and policyname = 'order_item_tenant_policy') then
    create policy order_item_tenant_policy on order_item
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order_item_modifier' and policyname = 'order_item_modifier_tenant_policy') then
    create policy order_item_modifier_tenant_policy on order_item_modifier
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'cash_shift_close' and policyname = 'cash_shift_close_tenant_policy') then
    create policy cash_shift_close_tenant_policy on cash_shift_close
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;
